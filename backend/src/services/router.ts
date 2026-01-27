/**
 * Message Router Service
 * 
 * A cost-optimized router that uses Claude Haiku as a fast classifier
 * to route messages to the appropriate model tier.
 * 
 * Classifications:
 * - SIMPLE_TOOL: Basic tool invocations → Haiku
 * - ANALYSIS: Data analysis, insights → Sonnet  
 * - PLANNING: Complex reasoning, multi-step planning → Opus
 * - CHITCHAT: Casual conversation → Haiku
 */

import { ClaudeService } from "./claude";
import {
  MODELS,
  type ModelName,
  type TokenUsage,
  ClaudeError,
} from "../types/claude";

// ============================================================================
// Types
// ============================================================================

export type MessageClass = "SIMPLE_TOOL" | "ANALYSIS" | "PLANNING" | "CHITCHAT";

export interface RouterConfig {
  /** ClaudeService instance (optional, creates new if not provided) */
  claudeService?: ClaudeService;
  /** Enable debug logging */
  debug?: boolean;
  /** Fallback model if classification fails */
  fallbackModel?: ModelName;
  /** Classification timeout in ms (default: 5000) */
  classificationTimeoutMs?: number;
}

export interface ClassificationResult {
  /** The determined message class */
  messageClass: MessageClass;
  /** Confidence level (if provided by classifier) */
  confidence?: number;
  /** Router token usage (always Haiku) */
  routerUsage: TokenUsage;
  /** Time taken for classification in ms */
  latencyMs: number;
}

export interface ModelSelectionResult {
  /** Selected model name */
  model: ModelName;
  /** The message class that determined selection */
  messageClass: MessageClass;
  /** Why this model was selected */
  reason: string;
}

export interface Cost {
  /** Cost in USD for input tokens */
  inputCost: number;
  /** Cost in USD for output tokens */
  outputCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Model used for calculation */
  model: string;
}

export interface RoutingResult {
  /** Classification result */
  classification: ClassificationResult;
  /** Model selection result */
  modelSelection: ModelSelectionResult;
  /** Router cost (Haiku classification) */
  routerCost: Cost;
}

export interface ExecutionCostSummary {
  /** Cost of routing (classification) */
  routerCost: Cost;
  /** Cost of execution (main response) */
  executionCost: Cost;
  /** Combined total cost */
  totalCost: Cost;
  /** Models used */
  models: {
    router: string;
    execution: string;
  };
}

// ============================================================================
// Constants
// ============================================================================

/** Model pricing per 1M tokens (as of 2024) */
export const MODEL_PRICING: Record<ModelName, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
};

/** Model selection mapping */
const MODEL_FOR_CLASS: Record<MessageClass, ModelName> = {
  SIMPLE_TOOL: "haiku",
  ANALYSIS: "sonnet",
  PLANNING: "opus",
  CHITCHAT: "haiku",
};

/** Reasons for model selection */
const SELECTION_REASONS: Record<MessageClass, string> = {
  SIMPLE_TOOL: "Simple tool invocation - Haiku is fast and cost-effective",
  ANALYSIS: "Analysis task - Sonnet provides good balance of capability and cost",
  PLANNING: "Complex planning - Opus excels at multi-step reasoning",
  CHITCHAT: "Casual conversation - Haiku handles chitchat efficiently",
};

/** Classification prompt for Haiku */
const CLASSIFICATION_SYSTEM_PROMPT = `You are a message classifier for an AAC (Augmentative and Alternative Communication) assistant. Your job is to classify user messages into one of four categories to route them to the appropriate AI model.

Categories:
1. SIMPLE_TOOL - Basic tool invocations like recording a word, logging communication events, simple lookups
2. ANALYSIS - Requests for data analysis, generating insights, understanding patterns, summarizing usage
3. PLANNING - Complex reasoning, creating communication plans, goal setting, multi-step strategies
4. CHITCHAT - Casual conversation, greetings, small talk, questions about capabilities

Respond with ONLY the category name (SIMPLE_TOOL, ANALYSIS, PLANNING, or CHITCHAT) on a single line. No explanation needed.`;

const DEFAULT_CLASSIFICATION_TIMEOUT_MS = 5000;
const DEFAULT_FALLBACK_MODEL: ModelName = "sonnet";

// ============================================================================
// Router Service
// ============================================================================

export class RouterService {
  private _claudeService: ClaudeService | null;
  private debug: boolean;
  private fallbackModel: ModelName;
  private classificationTimeoutMs: number;

  constructor(config: RouterConfig = {}) {
    // Lazy initialization - only create ClaudeService when needed
    this._claudeService = config.claudeService ?? null;
    this.debug = config.debug ?? false;
    this.fallbackModel = config.fallbackModel ?? DEFAULT_FALLBACK_MODEL;
    this.classificationTimeoutMs = config.classificationTimeoutMs ?? DEFAULT_CLASSIFICATION_TIMEOUT_MS;
  }

  /** Get or create the Claude service (lazy initialization) */
  private get claudeService(): ClaudeService {
    if (!this._claudeService) {
      this._claudeService = new ClaudeService();
    }
    return this._claudeService;
  }

  /**
   * Create router with a specific ClaudeService (for testing)
   */
  static withService(service: ClaudeService, config: Omit<RouterConfig, "claudeService"> = {}): RouterService {
    const router = new RouterService(config);
    router._claudeService = service;
    return router;
  }

  /**
   * Classify a message using Haiku as a fast classifier
   */
  async classifyMessage(message: string): Promise<ClassificationResult> {
    const startTime = performance.now();

    try {
      const response = await Promise.race([
        this.claudeService.chat({
          messages: [{ role: "user", content: message }],
          system: CLASSIFICATION_SYSTEM_PROMPT,
          model: "haiku",
          maxTokens: 20, // Classification is just a single word
          temperature: 0, // Deterministic classification
        }),
        this.createTimeout(this.classificationTimeoutMs),
      ]);

      const latencyMs = performance.now() - startTime;

      // Parse the response
      const textContent = response.content.find((block) => block.type === "text");
      if (!textContent || textContent.type !== "text") {
        this.log("warn", "No text content in classification response, using fallback");
        return this.createFallbackClassification(response.usage, latencyMs);
      }

      const rawClass = textContent.text.trim().toUpperCase();
      const messageClass = this.parseMessageClass(rawClass);

      if (!messageClass) {
        this.log("warn", `Unknown classification "${rawClass}", using fallback`);
        return this.createFallbackClassification(response.usage, latencyMs);
      }

      this.log("debug", `Classified message as ${messageClass} in ${latencyMs.toFixed(2)}ms`);

      return {
        messageClass,
        routerUsage: response.usage,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      this.log("error", `Classification failed: ${error instanceof Error ? error.message : String(error)}`);

      // Return fallback classification with zero usage (couldn't complete request)
      return {
        messageClass: this.getDefaultClassForFallback(),
        routerUsage: { inputTokens: 0, outputTokens: 0 },
        latencyMs,
      };
    }
  }

  /**
   * Select the appropriate model based on message classification
   */
  selectModel(messageClass: MessageClass): ModelSelectionResult {
    const model = MODEL_FOR_CLASS[messageClass];
    const reason = SELECTION_REASONS[messageClass];

    return {
      model,
      messageClass,
      reason,
    };
  }

  /**
   * Calculate cost for token usage with a specific model
   */
  calculateCost(usage: TokenUsage, model: ModelName): Cost {
    const pricing = MODEL_PRICING[model];
    
    // Calculate base costs (per 1M tokens)
    const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
    const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

    // Handle cache tokens (cache reads are cheaper, creation is same price)
    let cacheAdjustment = 0;
    if (usage.cacheReadInputTokens) {
      // Cache reads are typically 90% cheaper
      const cacheReadDiscount = (usage.cacheReadInputTokens / 1_000_000) * pricing.input * 0.9;
      cacheAdjustment -= cacheReadDiscount;
    }

    const totalCost = inputCost + outputCost + cacheAdjustment;

    return {
      inputCost,
      outputCost,
      totalCost,
      model: MODELS[model],
    };
  }

  /**
   * Route a message: classify, select model, and return routing info
   */
  async routeMessage(message: string): Promise<RoutingResult> {
    const classification = await this.classifyMessage(message);
    const modelSelection = this.selectModel(classification.messageClass);
    const routerCost = this.calculateCost(classification.routerUsage, "haiku");

    return {
      classification,
      modelSelection,
      routerCost,
    };
  }

  /**
   * Calculate combined cost summary for a routed message
   */
  calculateCostSummary(
    routerUsage: TokenUsage,
    executionUsage: TokenUsage,
    executionModel: ModelName
  ): ExecutionCostSummary {
    const routerCost = this.calculateCost(routerUsage, "haiku");
    const executionCost = this.calculateCost(executionUsage, executionModel);

    return {
      routerCost,
      executionCost,
      totalCost: {
        inputCost: routerCost.inputCost + executionCost.inputCost,
        outputCost: routerCost.outputCost + executionCost.outputCost,
        totalCost: routerCost.totalCost + executionCost.totalCost,
        model: "combined",
      },
      models: {
        router: MODELS.haiku,
        execution: MODELS[executionModel],
      },
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private parseMessageClass(raw: string): MessageClass | null {
    const validClasses: MessageClass[] = ["SIMPLE_TOOL", "ANALYSIS", "PLANNING", "CHITCHAT"];
    const normalized = raw.replace(/[^A-Z_]/g, "");
    return validClasses.includes(normalized as MessageClass) ? (normalized as MessageClass) : null;
  }

  private getDefaultClassForFallback(): MessageClass {
    // Map fallback model back to a class that would select it
    const classForModel = Object.entries(MODEL_FOR_CLASS).find(
      ([_, model]) => model === this.fallbackModel
    );
    return (classForModel?.[0] as MessageClass) ?? "ANALYSIS";
  }

  private createFallbackClassification(usage: TokenUsage, latencyMs: number): ClassificationResult {
    return {
      messageClass: this.getDefaultClassForFallback(),
      routerUsage: usage,
      latencyMs,
    };
  }

  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new ClaudeError(
          `Classification timed out after ${ms}ms`,
          "CLASSIFICATION_TIMEOUT",
          false,
          504
        ));
      }, ms);
    });
  }

  private log(level: "debug" | "warn" | "error", message: string): void {
    if (!this.debug && level === "debug") return;
    
    const prefix = `[RouterService]`;
    switch (level) {
      case "debug":
        console.log(`${prefix} ${message}`);
        break;
      case "warn":
        console.warn(`${prefix} ${message}`);
        break;
      case "error":
        console.error(`${prefix} ${message}`);
        break;
    }
  }
}

// ============================================================================
// Standalone Functions (for direct use without service instance)
// ============================================================================

/**
 * Classify a message using a provided ClaudeService
 */
export async function classifyMessage(
  message: string,
  claudeService: ClaudeService
): Promise<ClassificationResult> {
  const router = RouterService.withService(claudeService);
  return router.classifyMessage(message);
}

/**
 * Select model based on message class
 */
export function selectModel(messageClass: MessageClass): ModelSelectionResult {
  return {
    model: MODEL_FOR_CLASS[messageClass],
    messageClass,
    reason: SELECTION_REASONS[messageClass],
  };
}

/**
 * Calculate cost for token usage (standalone - no service needed)
 */
export function calculateCost(usage: TokenUsage, model: ModelName): Cost {
  const pricing = MODEL_PRICING[model];
  
  const inputCost = (usage.inputTokens / 1_000_000) * pricing.input;
  const outputCost = (usage.outputTokens / 1_000_000) * pricing.output;

  let cacheAdjustment = 0;
  if (usage.cacheReadInputTokens) {
    const cacheReadDiscount = (usage.cacheReadInputTokens / 1_000_000) * pricing.input * 0.9;
    cacheAdjustment -= cacheReadDiscount;
  }

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost + cacheAdjustment,
    model: MODELS[model],
  };
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultRouter: RouterService | null = null;

/**
 * Get the default router service instance
 */
export function getRouterService(): RouterService {
  if (!defaultRouter) {
    defaultRouter = new RouterService();
  }
  return defaultRouter;
}

/**
 * Reset the default router (useful for testing)
 */
export function resetRouterService(): void {
  defaultRouter = null;
}
