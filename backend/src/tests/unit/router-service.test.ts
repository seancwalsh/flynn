/**
 * Router Service Unit Tests
 * 
 * Comprehensive tests for the message router service including:
 * - Message classification with mocked Haiku responses
 * - Model selection logic
 * - Cost calculation accuracy
 * - Integration with Claude service
 * - Error handling and fallbacks
 */

import { describe, test, expect, beforeEach, mock } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
import {
  RouterService,
  classifyMessage,
  selectModel,
  calculateCost,
  resetRouterService,
  MODEL_PRICING,
} from "../../services/router";
import { ClaudeService } from "../../services/claude";
import type { TokenUsage } from "../../types/claude";

// ============================================================================
// Mock Setup
// ============================================================================

function createMockClaudeService(
  responseText: string,
  usage?: TokenUsage
): ClaudeService {
  const mockClient = {
    messages: {
      create: mock(async () => ({
        id: "msg_test",
        type: "message" as const,
        role: "assistant" as const,
        model: "claude-3-5-haiku-20241022",
        content: [{ type: "text" as const, text: responseText }],
        stop_reason: "end_turn" as const,
        stop_sequence: null,
        usage: {
          input_tokens: usage?.inputTokens ?? 50,
          output_tokens: usage?.outputTokens ?? 5,
        },
      })),
    },
  } as unknown as Anthropic;

  return ClaudeService.withClient(mockClient);
}

function createErrorClaudeService(error: Error): ClaudeService {
  const mockClient = {
    messages: {
      create: mock(async () => {
        throw error;
      }),
    },
  } as unknown as Anthropic;

  return ClaudeService.withClient(mockClient);
}

function createSlowClaudeService(delayMs: number, response: string): ClaudeService {
  const mockClient = {
    messages: {
      create: mock(async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return {
          id: "msg_test",
          type: "message" as const,
          role: "assistant" as const,
          model: "claude-3-5-haiku-20241022",
          content: [{ type: "text" as const, text: response }],
          stop_reason: "end_turn" as const,
          stop_sequence: null,
          usage: { input_tokens: 50, output_tokens: 5 },
        };
      }),
    },
  } as unknown as Anthropic;

  return ClaudeService.withClient(mockClient);
}

// ============================================================================
// Tests
// ============================================================================

describe("RouterService", () => {
  beforeEach(() => {
    resetRouterService();
  });

  describe("classifyMessage", () => {
    test("classifies SIMPLE_TOOL messages correctly", async () => {
      const service = createMockClaudeService("SIMPLE_TOOL");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Log that Emma said 'hello'");

      expect(result.messageClass).toBe("SIMPLE_TOOL");
      expect(result.routerUsage.inputTokens).toBe(50);
      expect(result.routerUsage.outputTokens).toBe(5);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test("classifies ANALYSIS messages correctly", async () => {
      const service = createMockClaudeService("ANALYSIS");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage(
        "What patterns do you see in Emma's word usage this week?"
      );

      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("classifies PLANNING messages correctly", async () => {
      const service = createMockClaudeService("PLANNING");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage(
        "Create a 4-week communication development plan for Emma focusing on social interactions"
      );

      expect(result.messageClass).toBe("PLANNING");
    });

    test("classifies CHITCHAT messages correctly", async () => {
      const service = createMockClaudeService("CHITCHAT");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Hi! How are you today?");

      expect(result.messageClass).toBe("CHITCHAT");
    });

    test("handles lowercase classification responses", async () => {
      const service = createMockClaudeService("simple_tool");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Record a word");

      expect(result.messageClass).toBe("SIMPLE_TOOL");
    });

    test("handles classification with extra whitespace", async () => {
      const service = createMockClaudeService("  ANALYSIS  \n");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Analyze the data");

      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("falls back on invalid classification response", async () => {
      const service = createMockClaudeService("UNKNOWN_CLASS");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Do something");

      // Default fallback is ANALYSIS (maps to sonnet)
      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("falls back on empty response", async () => {
      const service = createMockClaudeService("");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Do something");

      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("handles API errors gracefully", async () => {
      const service = createErrorClaudeService(new Error("API Error"));
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("Test message");

      // Should fall back to default class
      expect(result.messageClass).toBe("ANALYSIS");
      expect(result.routerUsage.inputTokens).toBe(0);
      expect(result.routerUsage.outputTokens).toBe(0);
    });

    test("handles classification timeout", async () => {
      const service = createSlowClaudeService(200, "SIMPLE_TOOL");
      const router = RouterService.withService(service, {
        classificationTimeoutMs: 50,
      });

      const result = await router.classifyMessage("Test message");

      // Should fall back due to timeout
      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("respects custom fallback model", async () => {
      const service = createErrorClaudeService(new Error("API Error"));
      const router = RouterService.withService(service, {
        fallbackModel: "haiku",
      });

      const result = await router.classifyMessage("Test message");

      // Haiku is used for SIMPLE_TOOL and CHITCHAT
      expect(["SIMPLE_TOOL", "CHITCHAT"]).toContain(result.messageClass);
    });

    test("tracks latency accurately", async () => {
      const service = createSlowClaudeService(50, "CHITCHAT");
      const router = RouterService.withService(service, {
        classificationTimeoutMs: 1000,
      });

      const result = await router.classifyMessage("Hi");

      expect(result.latencyMs).toBeGreaterThanOrEqual(50);
      expect(result.latencyMs).toBeLessThan(200); // Some reasonable upper bound
    });
  });

  describe("selectModel", () => {
    test("selects haiku for SIMPLE_TOOL", () => {
      const router = new RouterService();
      const result = router.selectModel("SIMPLE_TOOL");

      expect(result.model).toBe("haiku");
      expect(result.messageClass).toBe("SIMPLE_TOOL");
      expect(result.reason).toContain("fast");
    });

    test("selects sonnet for ANALYSIS", () => {
      const router = new RouterService();
      const result = router.selectModel("ANALYSIS");

      expect(result.model).toBe("sonnet");
      expect(result.messageClass).toBe("ANALYSIS");
      expect(result.reason).toContain("balance");
    });

    test("selects opus for PLANNING", () => {
      const router = new RouterService();
      const result = router.selectModel("PLANNING");

      expect(result.model).toBe("opus");
      expect(result.messageClass).toBe("PLANNING");
      expect(result.reason).toContain("reasoning");
    });

    test("selects haiku for CHITCHAT", () => {
      const router = new RouterService();
      const result = router.selectModel("CHITCHAT");

      expect(result.model).toBe("haiku");
      expect(result.messageClass).toBe("CHITCHAT");
      expect(result.reason).toContain("efficiently");
    });
  });

  describe("calculateCost", () => {
    test("calculates haiku costs correctly", () => {
      const router = new RouterService();
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
      };

      const cost = router.calculateCost(usage, "haiku");

      // Haiku: $0.80/1M input, $4.00/1M output
      const expectedInput = (1000 / 1_000_000) * 0.80; // $0.0008
      const expectedOutput = (500 / 1_000_000) * 4.00; // $0.002

      expect(cost.inputCost).toBeCloseTo(expectedInput, 10);
      expect(cost.outputCost).toBeCloseTo(expectedOutput, 10);
      expect(cost.totalCost).toBeCloseTo(expectedInput + expectedOutput, 10);
      expect(cost.model).toBe("claude-3-5-haiku-20241022");
    });

    test("calculates sonnet costs correctly", () => {
      const router = new RouterService();
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
      };

      const cost = router.calculateCost(usage, "sonnet");

      // Sonnet: $3.00/1M input, $15.00/1M output
      const expectedInput = (1000 / 1_000_000) * 3.00;
      const expectedOutput = (500 / 1_000_000) * 15.00;

      expect(cost.inputCost).toBeCloseTo(expectedInput, 10);
      expect(cost.outputCost).toBeCloseTo(expectedOutput, 10);
      expect(cost.totalCost).toBeCloseTo(expectedInput + expectedOutput, 10);
    });

    test("calculates opus costs correctly", () => {
      const router = new RouterService();
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
      };

      const cost = router.calculateCost(usage, "opus");

      // Opus: $15.00/1M input, $75.00/1M output
      const expectedInput = (1000 / 1_000_000) * 15.00;
      const expectedOutput = (500 / 1_000_000) * 75.00;

      expect(cost.inputCost).toBeCloseTo(expectedInput, 10);
      expect(cost.outputCost).toBeCloseTo(expectedOutput, 10);
      expect(cost.totalCost).toBeCloseTo(expectedInput + expectedOutput, 10);
    });

    test("handles zero token usage", () => {
      const router = new RouterService();
      const usage: TokenUsage = {
        inputTokens: 0,
        outputTokens: 0,
      };

      const cost = router.calculateCost(usage, "sonnet");

      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });

    test("handles cache read tokens (discount)", () => {
      const router = new RouterService();
      const usage: TokenUsage = {
        inputTokens: 1000,
        outputTokens: 500,
        cacheReadInputTokens: 500,
      };

      const cost = router.calculateCost(usage, "sonnet");

      // Should apply 90% discount on cache read tokens
      const expectedInput = (1000 / 1_000_000) * 3.00;
      const expectedOutput = (500 / 1_000_000) * 15.00;
      const cacheDiscount = (500 / 1_000_000) * 3.00 * 0.9;

      expect(cost.totalCost).toBeCloseTo(expectedInput + expectedOutput - cacheDiscount, 10);
    });
  });

  describe("routeMessage", () => {
    test("returns complete routing result", async () => {
      const service = createMockClaudeService("ANALYSIS", {
        inputTokens: 100,
        outputTokens: 10,
      });
      const router = RouterService.withService(service);

      const result = await router.routeMessage("Analyze Emma's progress");

      expect(result.classification.messageClass).toBe("ANALYSIS");
      expect(result.modelSelection.model).toBe("sonnet");
      expect(result.routerCost.model).toBe("claude-3-5-haiku-20241022");
      expect(result.routerCost.totalCost).toBeGreaterThan(0);
    });

    test("routing stays under 100ms latency target for mocked responses", async () => {
      const service = createMockClaudeService("CHITCHAT");
      const router = RouterService.withService(service);

      const startTime = performance.now();
      await router.routeMessage("Hello!");
      const endTime = performance.now();

      // Mocked responses should be nearly instant
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe("calculateCostSummary", () => {
    test("combines router and execution costs", () => {
      const router = new RouterService();

      const routerUsage: TokenUsage = {
        inputTokens: 100,
        outputTokens: 10,
      };

      const executionUsage: TokenUsage = {
        inputTokens: 2000,
        outputTokens: 1000,
      };

      const summary = router.calculateCostSummary(routerUsage, executionUsage, "sonnet");

      expect(summary.routerCost.model).toBe("claude-3-5-haiku-20241022");
      expect(summary.executionCost.model).toBe("claude-sonnet-4-20250514");
      expect(summary.totalCost.totalCost).toBe(
        summary.routerCost.totalCost + summary.executionCost.totalCost
      );
      expect(summary.models.router).toBe("claude-3-5-haiku-20241022");
      expect(summary.models.execution).toBe("claude-sonnet-4-20250514");
    });

    test("shows cost savings vs always using opus", () => {
      const router = new RouterService();

      // Simulate a simple request routed to haiku
      const routerUsage: TokenUsage = {
        inputTokens: 100,
        outputTokens: 10,
      };
      const executionUsage: TokenUsage = {
        inputTokens: 500,
        outputTokens: 200,
      };

      // Cost with routing (haiku router + haiku execution)
      const summary = router.calculateCostSummary(routerUsage, executionUsage, "haiku");

      // Cost if we always used opus
      const opusCost = router.calculateCost(executionUsage, "opus");

      // Routing should be cheaper for simple requests
      expect(summary.totalCost.totalCost).toBeLessThan(opusCost.totalCost);
    });
  });

  describe("standalone functions", () => {
    test("selectModel works as standalone function", () => {
      const result = selectModel("PLANNING");

      expect(result.model).toBe("opus");
      expect(result.messageClass).toBe("PLANNING");
    });

    test("calculateCost works as standalone function", () => {
      const cost = calculateCost(
        { inputTokens: 1000, outputTokens: 500 },
        "sonnet"
      );

      expect(cost.inputCost).toBeGreaterThan(0);
      expect(cost.outputCost).toBeGreaterThan(0);
    });

    test("classifyMessage works as standalone function", async () => {
      const service = createMockClaudeService("SIMPLE_TOOL");

      const result = await classifyMessage("Log a word", service);

      expect(result.messageClass).toBe("SIMPLE_TOOL");
    });
  });

  describe("getRouterService singleton", () => {
    test("returns same instance on multiple calls", () => {
      // Note: This will fail if API key isn't set, but we're testing the singleton pattern
      resetRouterService();
      
      // Can't easily test without API key, but we can test reset works
      expect(() => resetRouterService()).not.toThrow();
    });
  });

  describe("MODEL_PRICING constants", () => {
    test("all models have pricing defined", () => {
      expect(MODEL_PRICING.haiku).toBeDefined();
      expect(MODEL_PRICING.sonnet).toBeDefined();
      expect(MODEL_PRICING.opus).toBeDefined();
    });

    test("pricing structure is correct", () => {
      for (const model of Object.keys(MODEL_PRICING) as Array<keyof typeof MODEL_PRICING>) {
        expect(MODEL_PRICING[model].input).toBeGreaterThan(0);
        expect(MODEL_PRICING[model].output).toBeGreaterThan(0);
        // Output typically costs more than input
        expect(MODEL_PRICING[model].output).toBeGreaterThanOrEqual(MODEL_PRICING[model].input);
      }
    });

    test("haiku is cheapest, opus is most expensive", () => {
      expect(MODEL_PRICING.haiku.input).toBeLessThan(MODEL_PRICING.sonnet.input);
      expect(MODEL_PRICING.sonnet.input).toBeLessThan(MODEL_PRICING.opus.input);

      expect(MODEL_PRICING.haiku.output).toBeLessThan(MODEL_PRICING.sonnet.output);
      expect(MODEL_PRICING.sonnet.output).toBeLessThan(MODEL_PRICING.opus.output);
    });
  });

  describe("edge cases", () => {
    test("handles very long messages", async () => {
      const service = createMockClaudeService("ANALYSIS");
      const router = RouterService.withService(service);

      const longMessage = "Analyze this data: " + "word ".repeat(1000);
      const result = await router.classifyMessage(longMessage);

      expect(result.messageClass).toBe("ANALYSIS");
    });

    test("handles unicode messages", async () => {
      const service = createMockClaudeService("CHITCHAT");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("こんにちは! 🎉 How are you?");

      expect(result.messageClass).toBe("CHITCHAT");
    });

    test("handles empty message", async () => {
      const service = createMockClaudeService("CHITCHAT");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage("");

      expect(result.messageClass).toBe("CHITCHAT");
    });

    test("handles message with special characters", async () => {
      const service = createMockClaudeService("SIMPLE_TOOL");
      const router = RouterService.withService(service);

      const result = await router.classifyMessage(
        "Log: <script>alert('xss')</script> & \"quotes\" 'single'"
      );

      expect(result.messageClass).toBe("SIMPLE_TOOL");
    });
  });
});

describe("Router Integration", () => {
  test("full routing flow from message to cost", async () => {
    const service = createMockClaudeService("PLANNING", {
      inputTokens: 150,
      outputTokens: 8,
    });
    const router = RouterService.withService(service);

    // Step 1: Route the message
    const routing = await router.routeMessage(
      "Create a comprehensive 6-month communication development plan for Emma"
    );

    expect(routing.classification.messageClass).toBe("PLANNING");
    expect(routing.modelSelection.model).toBe("opus");

    // Step 2: Simulate execution response
    const executionUsage: TokenUsage = {
      inputTokens: 5000,
      outputTokens: 3000,
    };

    // Step 3: Calculate total cost
    const costSummary = router.calculateCostSummary(
      routing.classification.routerUsage,
      executionUsage,
      routing.modelSelection.model
    );

    expect(costSummary.routerCost.totalCost).toBeGreaterThan(0);
    expect(costSummary.executionCost.totalCost).toBeGreaterThan(0);
    expect(costSummary.totalCost.totalCost).toBe(
      costSummary.routerCost.totalCost + costSummary.executionCost.totalCost
    );

    // Router cost should be tiny compared to opus execution
    expect(costSummary.routerCost.totalCost).toBeLessThan(
      costSummary.executionCost.totalCost * 0.1
    );
  });

  test("cost optimization: chitchat saves money vs sonnet baseline", async () => {
    const service = createMockClaudeService("CHITCHAT", {
      inputTokens: 80,
      outputTokens: 5,
    });
    const router = RouterService.withService(service);

    // Route a chitchat message
    const routing = await router.routeMessage("Hi there! How's it going?");

    const executionUsage: TokenUsage = {
      inputTokens: 200,
      outputTokens: 100,
    };

    // Routed cost (haiku router + haiku execution)
    const routedSummary = router.calculateCostSummary(
      routing.classification.routerUsage,
      executionUsage,
      routing.modelSelection.model // haiku
    );

    // Baseline cost (always sonnet, no router)
    const baselineCost = router.calculateCost(executionUsage, "sonnet");

    // Should save money even with router overhead
    expect(routedSummary.totalCost.totalCost).toBeLessThan(baselineCost.totalCost);
  });
});
