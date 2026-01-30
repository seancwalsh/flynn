/**
 * Prompts Unit Tests
 * 
 * Tests for the Flynn system prompts and prompt builders.
 */

import { describe, test, expect } from "bun:test";
import {
  FLYNN_SYSTEM_PROMPT,
  buildSystemPromptWithChild,
  buildSystemPromptWithCaregiver,
  buildFullContextPrompt,
  getToolInstructions,
  WELCOME_MESSAGES,
  ERROR_MESSAGES,
  formatDate,
  generateConversationTitle,
} from "../../services/prompts";
import type { Child, Caregiver } from "../../db/schema";

// ============================================================================
// Test Fixtures
// ============================================================================

const mockChild: Child = {
  id: "child-123",
  familyId: "family-456",
  name: "Emma",
  birthDate: "2021-06-15",
  createdAt: new Date("2024-01-01"),
};

const mockChildNoDate: Child = {
  id: "child-789",
  familyId: "family-456",
  name: "Liam",
  birthDate: null,
  createdAt: new Date("2024-01-01"),
};

const mockCaregiver: Caregiver = {
  id: "caregiver-123",
  familyId: "family-456",
  name: "Sarah Johnson",
  email: "sarah@example.com",
  role: "parent",
  createdAt: new Date("2024-01-01"),
};

// ============================================================================
// Tests
// ============================================================================

describe("FLYNN_SYSTEM_PROMPT", () => {
  test("contains core identity elements", () => {
    expect(FLYNN_SYSTEM_PROMPT).toContain("Flynn");
    expect(FLYNN_SYSTEM_PROMPT).toContain("AAC");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Augmentative and Alternative Communication");
  });

  test("includes personality traits", () => {
    expect(FLYNN_SYSTEM_PROMPT).toContain("Warm and Encouraging");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Clear and Accessible");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Evidence-Informed");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Empathetic");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Respectful of Expertise");
  });

  test("includes tool usage guidelines", () => {
    expect(FLYNN_SYSTEM_PROMPT).toContain("Tool Usage Guidelines");
    expect(FLYNN_SYSTEM_PROMPT).toContain("When to use tools");
    expect(FLYNN_SYSTEM_PROMPT).toContain("When NOT to use tools");
    expect(FLYNN_SYSTEM_PROMPT).toContain("Before writing data");
  });

  test("includes important boundaries", () => {
    expect(FLYNN_SYSTEM_PROMPT).toContain("Important Boundaries");
    expect(FLYNN_SYSTEM_PROMPT).toContain("speech-language pathologist");
    expect(FLYNN_SYSTEM_PROMPT).toContain("cannot diagnose");
    expect(FLYNN_SYSTEM_PROMPT).toContain("privacy");
  });
});

describe("buildSystemPromptWithChild", () => {
  test("includes child name", () => {
    const prompt = buildSystemPromptWithChild(mockChild);
    expect(prompt).toContain("**Emma**");
  });

  test("includes child ID", () => {
    const prompt = buildSystemPromptWithChild(mockChild);
    expect(prompt).toContain("Child ID: child-123");
  });

  test("calculates and includes age when birth date present", () => {
    const prompt = buildSystemPromptWithChild(mockChild);
    // Age calculation is dynamic, just check format
    expect(prompt).toMatch(/\(\d+.*old\)/);
  });

  test("handles missing birth date", () => {
    const prompt = buildSystemPromptWithChild(mockChildNoDate);
    expect(prompt).toContain("**Liam**");
    expect(prompt).not.toContain("old)"); // No age displayed
  });

  test("preserves base system prompt", () => {
    const prompt = buildSystemPromptWithChild(mockChild);
    expect(prompt).toContain(FLYNN_SYSTEM_PROMPT);
  });

  test("includes context section", () => {
    const prompt = buildSystemPromptWithChild(mockChild);
    expect(prompt).toContain("## Current Context");
  });
});

describe("buildSystemPromptWithCaregiver", () => {
  test("includes caregiver name and role", () => {
    const prompt = buildSystemPromptWithCaregiver(mockCaregiver);
    expect(prompt).toContain("**Sarah Johnson**");
    expect(prompt).toContain("(parent)");
  });

  test("includes child when provided", () => {
    const prompt = buildSystemPromptWithCaregiver(mockCaregiver, mockChild);
    expect(prompt).toContain("**Sarah Johnson**");
    expect(prompt).toContain("**Emma**");
  });

  test("handles missing child", () => {
    const prompt = buildSystemPromptWithCaregiver(mockCaregiver);
    expect(prompt).toContain("**Sarah Johnson**");
    expect(prompt).not.toContain("Emma");
  });
});

describe("buildFullContextPrompt", () => {
  test("builds prompt with all context", () => {
    const prompt = buildFullContextPrompt({
      caregiver: mockCaregiver,
      child: mockChild,
      recentContext: "Discussed vocabulary expansion yesterday",
    });

    expect(prompt).toContain(FLYNN_SYSTEM_PROMPT);
    expect(prompt).toContain("Sarah Johnson");
    expect(prompt).toContain("Emma");
    expect(prompt).toContain("vocabulary expansion");
  });

  test("builds prompt with partial context", () => {
    const prompt = buildFullContextPrompt({
      child: mockChild,
    });

    expect(prompt).toContain(FLYNN_SYSTEM_PROMPT);
    expect(prompt).toContain("Emma");
  });

  test("builds prompt with no context", () => {
    const prompt = buildFullContextPrompt({});
    expect(prompt).toBe(FLYNN_SYSTEM_PROMPT);
  });
});

describe("getToolInstructions", () => {
  test("returns empty string for no tools", () => {
    const instructions = getToolInstructions([]);
    expect(instructions).toBe("");
  });

  test("includes get_usage_stats instructions", () => {
    const instructions = getToolInstructions(["get_usage_stats"]);
    expect(instructions).toContain("get_usage_stats");
    expect(instructions).toContain("word frequency");
  });

  test("includes get_vocabulary_growth instructions", () => {
    const instructions = getToolInstructions(["get_vocabulary_growth"]);
    expect(instructions).toContain("get_vocabulary_growth");
    expect(instructions).toContain("new words");
  });

  test("includes get_recent_sessions instructions", () => {
    const instructions = getToolInstructions(["get_recent_sessions"]);
    expect(instructions).toContain("get_recent_sessions");
    expect(instructions).toContain("recent AAC sessions");
  });

  test("includes search_symbols instructions", () => {
    const instructions = getToolInstructions(["search_symbols"]);
    expect(instructions).toContain("search_symbols");
    expect(instructions).toContain("find specific words");
  });

  test("includes get_milestones instructions", () => {
    const instructions = getToolInstructions(["get_milestones"]);
    expect(instructions).toContain("get_milestones");
    expect(instructions).toContain("milestones");
  });

  test("includes multiple tools", () => {
    const instructions = getToolInstructions([
      "get_usage_stats",
      "get_milestones",
    ]);
    expect(instructions).toContain("get_usage_stats");
    expect(instructions).toContain("get_milestones");
    expect(instructions).toContain("## Available Tools");
  });
});

describe("WELCOME_MESSAGES", () => {
  test("newUser generates personalized welcome", () => {
    const message = WELCOME_MESSAGES.newUser("Emma");
    expect(message).toContain("Flynn");
    expect(message).toContain("Emma");
    expect(message).toContain("👋");
  });

  test("returningUser generates personalized greeting", () => {
    const message = WELCOME_MESSAGES.returningUser("Sarah", "Emma");
    expect(message).toContain("Sarah");
    expect(message).toContain("Emma");
    expect(message).toContain("Welcome back");
  });

  test("withMilestone includes celebration", () => {
    const message = WELCOME_MESSAGES.withMilestone("Emma", "learned 10 new words this week");
    expect(message).toContain("🎉");
    expect(message).toContain("Emma");
    expect(message).toContain("10 new words");
  });
});

describe("ERROR_MESSAGES", () => {
  test("noData includes child name", () => {
    const message = ERROR_MESSAGES.noData("Emma");
    expect(message).toContain("Emma");
    expect(message).toContain("don't have any usage data");
  });

  test("toolFailed provides graceful message", () => {
    const message = ERROR_MESSAGES.toolFailed("get_stats");
    expect(message).toContain("trouble retrieving");
    expect(message).toContain("different approach");
  });

  test("notAuthorized is clear about access", () => {
    const message = ERROR_MESSAGES.notAuthorized();
    expect(message).toContain("authorized");
  });

  test("generic provides helpful guidance", () => {
    const message = ERROR_MESSAGES.generic();
    expect(message).toContain("Something went wrong");
    expect(message).toContain("try asking again");
  });
});

describe("formatDate", () => {
  test("formats Date object", () => {
    const date = new Date("2024-03-15T12:00:00Z");
    const formatted = formatDate(date);
    expect(formatted).toContain("March");
    expect(formatted).toContain("15");
    expect(formatted).toContain("2024");
  });

  test("formats date string", () => {
    const formatted = formatDate("2024-06-20");
    expect(formatted).toContain("June");
    expect(formatted).toContain("20");
    expect(formatted).toContain("2024");
  });
});

describe("generateConversationTitle", () => {
  test("uses full message when short", () => {
    const title = generateConversationTitle("How is Emma doing?");
    expect(title).toBe("How is Emma doing?");
  });

  test("truncates long messages", () => {
    const longMessage = "This is a very long message that should be truncated because it exceeds the maximum allowed length for a conversation title";
    const title = generateConversationTitle(longMessage);
    expect(title.length).toBeLessThanOrEqual(53); // 50 + "..."
    expect(title).toEndWith("...");
  });

  test("truncates at word boundary when possible", () => {
    // With enough space for word boundary
    const message = "What are some good activities for child communication development?";
    const title = generateConversationTitle(message);
    expect(title).toEndWith("...");
    // Title should be truncated
    expect(title.length).toBeLessThanOrEqual(53);
  });

  test("normalizes whitespace", () => {
    const message = "How   is   Emma    doing?";
    const title = generateConversationTitle(message);
    expect(title).toBe("How is Emma doing?");
  });

  test("handles edge cases", () => {
    expect(generateConversationTitle("Hi")).toBe("Hi");
    expect(generateConversationTitle("   Hi   ")).toBe("Hi");
  });
});

describe("Age calculation", () => {
  test("calculates months for babies", () => {
    // Create a child born 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const babyChild: Child = {
      ...mockChild,
      birthDate: sixMonthsAgo.toISOString().split("T")[0],
    };

    const prompt = buildSystemPromptWithChild(babyChild);
    expect(prompt).toMatch(/\d+ month/);
  });

  test("calculates years and months for toddlers", () => {
    // Create a child born 18 months ago
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
    
    const toddlerChild: Child = {
      ...mockChild,
      birthDate: eighteenMonthsAgo.toISOString().split("T")[0],
    };

    const prompt = buildSystemPromptWithChild(toddlerChild);
    expect(prompt).toMatch(/1 year.*month/);
  });

  test("calculates years for older children", () => {
    // Create a child born 5 years ago
    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
    
    const olderChild: Child = {
      ...mockChild,
      birthDate: fiveYearsAgo.toISOString().split("T")[0],
    };

    const prompt = buildSystemPromptWithChild(olderChild);
    expect(prompt).toMatch(/\d+ years old/);
  });
});
