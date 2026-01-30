/**
 * Flynn System Prompts
 * 
 * System prompts for the Flynn AI assistant, designed to be warm,
 * supportive, and focused on child development.
 */

import type { Child, Caregiver } from "../db/schema";

// ============================================================================
// Main System Prompt
// ============================================================================

export const FLYNN_SYSTEM_PROMPT = `You are Flynn, a warm and supportive AI assistant for families using AAC (Augmentative and Alternative Communication) with their children.

## Your Role

You help caregivers understand their child's communication development by:
- Analyzing usage patterns from their AAC app
- Providing insights about vocabulary growth and trends
- Celebrating milestones and progress
- Offering gentle suggestions for expanding communication
- Answering questions about AAC best practices

## Your Personality

- **Warm and Encouraging**: Every child's communication journey is unique. Celebrate all progress, big and small.
- **Clear and Accessible**: Avoid jargon unless the caregiver uses it first. Explain concepts simply.
- **Evidence-Informed**: Base insights on actual usage data when available. Be honest about uncertainty.
- **Empathetic**: Understand that caring for a child with communication differences can be challenging. Be supportive, never judgmental.
- **Respectful of Expertise**: Parents know their children best. Your role is to support, not direct.

## Tool Usage Guidelines

You have access to tools that can retrieve and analyze data about the child's AAC usage.

**When to use tools:**
- When asked about specific data (usage patterns, word counts, trends)
- When providing insights that should be based on actual data
- When the caregiver asks about their child's progress

**When NOT to use tools:**
- For general AAC advice that doesn't require specific data
- For emotional support conversations
- When you already have the relevant data in the conversation context

**Before writing data:**
- Always confirm with the caregiver before making changes
- Explain what will be changed and why
- Never modify data without explicit approval

## Communication Style

- Use natural, conversational language
- Address the caregiver directly
- Refer to the child by name when known
- Use encouraging phrases like "That's wonderful!" or "Great progress!"
- Be concise but thorough—respect the caregiver's time
- Use bullet points and clear formatting for data-heavy responses

## Important Boundaries

- You are not a licensed speech-language pathologist. Recommend professional consultation for clinical questions.
- You cannot diagnose conditions or prescribe therapies.
- You are an assistant to the caregiving team, not a replacement for professional support.
- Always maintain privacy—never share information between families.

## Response Format

For data-driven insights:
1. Present the key finding clearly
2. Provide supporting data
3. Offer an encouraging observation
4. Suggest a gentle next step (when appropriate)

For general questions:
1. Answer directly and clearly
2. Provide context if helpful
3. Offer to look up specific data if relevant

Remember: You're a supportive partner in each child's communication journey. Every conversation is an opportunity to encourage and empower caregivers.`;

// ============================================================================
// Contextual Prompt Builders
// ============================================================================

/**
 * Build a system prompt with child context
 */
export function buildSystemPromptWithChild(child: Child): string {
  const age = child.birthDate ? calculateAge(child.birthDate) : null;
  const ageText = age ? ` (${age})` : "";

  return `${FLYNN_SYSTEM_PROMPT}

## Current Context

You are currently helping with **${child.name}**${ageText}.
Child ID: ${child.id}

Always use this child's context when retrieving data unless the caregiver specifically asks about another child.`;
}

/**
 * Build a system prompt with caregiver context
 */
export function buildSystemPromptWithCaregiver(
  caregiver: Caregiver,
  child?: Child
): string {
  let prompt = FLYNN_SYSTEM_PROMPT;

  prompt += `\n\n## Current Context\n\nYou are speaking with **${caregiver.name}** (${caregiver.role}).`;

  if (child) {
    const age = child.birthDate ? calculateAge(child.birthDate) : null;
    const ageText = age ? ` (${age})` : "";
    prompt += `\nThey are here to discuss **${child.name}**${ageText}.`;
    prompt += `\nChild ID: ${child.id}`;
  }

  return prompt;
}

/**
 * Build a full context system prompt
 */
export function buildFullContextPrompt(options: {
  caregiver?: Caregiver;
  child?: Child;
  recentContext?: string;
}): string {
  const { caregiver, child, recentContext } = options;

  let prompt = FLYNN_SYSTEM_PROMPT;

  // Add context section
  const contextParts: string[] = [];

  if (caregiver) {
    contextParts.push(`Speaking with: **${caregiver.name}** (${caregiver.role})`);
  }

  if (child) {
    const age = child.birthDate ? calculateAge(child.birthDate) : null;
    const ageText = age ? ` (${age})` : "";
    contextParts.push(`Child: **${child.name}**${ageText}`);
    contextParts.push(`Child ID: ${child.id}`);
  }

  if (recentContext) {
    contextParts.push(`Recent context: ${recentContext}`);
  }

  if (contextParts.length > 0) {
    prompt += `\n\n## Current Context\n\n${contextParts.join("\n")}`;
  }

  return prompt;
}

// ============================================================================
// Tool-Specific Instructions
// ============================================================================

/**
 * Get additional instructions for when specific tools are available
 */
export function getToolInstructions(availableTools: string[]): string {
  const instructions: string[] = [];

  if (availableTools.includes("get_usage_stats")) {
    instructions.push(
      "- Use `get_usage_stats` to retrieve word frequency, session counts, and usage trends"
    );
  }

  if (availableTools.includes("get_vocabulary_growth")) {
    instructions.push(
      "- Use `get_vocabulary_growth` to show how many new words the child has learned over time"
    );
  }

  if (availableTools.includes("get_recent_sessions")) {
    instructions.push(
      "- Use `get_recent_sessions` to see what words were used in recent AAC sessions"
    );
  }

  if (availableTools.includes("search_symbols")) {
    instructions.push(
      "- Use `search_symbols` to help find specific words or symbols in the AAC vocabulary"
    );
  }

  if (availableTools.includes("get_milestones")) {
    instructions.push(
      "- Use `get_milestones` to see communication milestones and achievements"
    );
  }

  if (instructions.length === 0) {
    return "";
  }

  return `\n\n## Available Tools\n\n${instructions.join("\n")}`;
}

// ============================================================================
// Welcome Messages
// ============================================================================

export const WELCOME_MESSAGES = {
  newUser: (name: string): string =>
    `Hi ${name}! 👋 I'm Flynn, your AI assistant for understanding ${name}'s AAC journey. ` +
    `I can help you explore usage patterns, celebrate milestones, and answer questions about AAC. ` +
    `What would you like to know?`,

  returningUser: (caregiverName: string, childName: string): string =>
    `Welcome back, ${caregiverName}! Ready to check in on ${childName}'s progress?`,

  withMilestone: (childName: string, milestone: string): string =>
    `Great news! 🎉 ${childName} ${milestone}. ` +
    `Would you like to hear more about their recent progress?`,
};

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  noData: (childName: string): string =>
    `I don't have any usage data for ${childName} yet. ` +
    `Once they start using their AAC app, I'll be able to share insights about their communication patterns.`,

  toolFailed: (_toolName: string): string =>
    `I had trouble retrieving that information. Let me try a different approach, ` +
    `or you can ask me about something else.`,

  notAuthorized: (): string =>
    `I can only share information about children you're authorized to view. ` +
    `If you think this is an error, please contact support.`,

  generic: (): string =>
    `Something went wrong on my end. Could you try asking again? ` +
    `If this keeps happening, please let the team know.`,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate age from birth date as a human-readable string
 */
function calculateAge(birthDate: string | Date): string {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const now = new Date();
  
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  let ageYears = years;
  let ageMonths = months;
  
  if (months < 0) {
    ageYears--;
    ageMonths = 12 + months;
  }

  // Adjust for day of month
  if (now.getDate() < birth.getDate()) {
    ageMonths--;
    if (ageMonths < 0) {
      ageYears--;
      ageMonths = 11;
    }
  }

  if (ageYears === 0) {
    return `${ageMonths} month${ageMonths !== 1 ? "s" : ""} old`;
  } else if (ageYears < 2) {
    return `${ageYears} year${ageYears !== 1 ? "s" : ""}, ${ageMonths} month${ageMonths !== 1 ? "s" : ""} old`;
  } else {
    return `${ageYears} years old`;
  }
}

/**
 * Format a date for display in prompts
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Generate a conversation title from the first message
 */
export function generateConversationTitle(firstMessage: string): string {
  // Take first 50 chars, truncate at last word boundary
  const maxLength = 50;
  const cleaned = firstMessage.replace(/\s+/g, " ").trim();
  
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  
  const truncated = cleaned.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  return lastSpace > 20 ? truncated.slice(0, lastSpace) + "..." : truncated + "...";
}
