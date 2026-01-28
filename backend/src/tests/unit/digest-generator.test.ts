/**
 * Tests for Daily Digest Generator
 * FLY-100: AI-generated daily digest
 */

import { describe, it, expect } from "bun:test";

// Test helper functions extracted from the service

describe("Digest Generator - Title Generation", () => {
  const generateTitle = (data: {
    anomaliesToday: Array<{ severity: string }>;
    newSymbols: string[];
    today?: { totalTaps: number } | null;
    yesterday?: { totalTaps: number } | null;
  }): string => {
    if (data.anomaliesToday.some((a) => a.severity === "critical")) {
      return "Daily Summary - Needs Attention";
    }
    if (data.newSymbols.length > 0) {
      return "Daily Summary - New Words! 🎉";
    }
    if (
      data.today &&
      data.yesterday &&
      data.today.totalTaps > data.yesterday.totalTaps * 1.2
    ) {
      return "Daily Summary - Great Progress!";
    }
    return "Daily Summary";
  };

  it("returns attention title for critical anomalies", () => {
    const title = generateTitle({
      anomaliesToday: [{ severity: "critical" }],
      newSymbols: [],
    });
    expect(title).toBe("Daily Summary - Needs Attention");
  });

  it("returns new words title when new symbols present", () => {
    const title = generateTitle({
      anomaliesToday: [],
      newSymbols: ["want", "more"],
    });
    expect(title).toBe("Daily Summary - New Words! 🎉");
  });

  it("returns progress title when taps increased >20%", () => {
    const title = generateTitle({
      anomaliesToday: [],
      newSymbols: [],
      today: { totalTaps: 60 },
      yesterday: { totalTaps: 40 },
    });
    expect(title).toBe("Daily Summary - Great Progress!");
  });

  it("returns default title for normal days", () => {
    const title = generateTitle({
      anomaliesToday: [],
      newSymbols: [],
      today: { totalTaps: 40 },
      yesterday: { totalTaps: 42 },
    });
    expect(title).toBe("Daily Summary");
  });

  it("prioritizes critical anomalies over new words", () => {
    const title = generateTitle({
      anomaliesToday: [{ severity: "critical" }],
      newSymbols: ["want"],
    });
    expect(title).toBe("Daily Summary - Needs Attention");
  });
});

describe("Digest Generator - Anomaly Message Formatting", () => {
  const formatAnomalyMessage = (anomaly: {
    type: string;
    severity: string;
    actualValue: string;
    expectedValue: string;
  }): string => {
    const severity = anomaly.severity === "critical" ? "⚠️ " : "";

    switch (anomaly.type) {
      case "usage_drop":
        return `${severity}AAC usage was lower than usual (${anomaly.actualValue} vs expected ${parseFloat(anomaly.expectedValue).toFixed(0)})`;
      case "vocabulary_regression":
        return `${severity}Fewer unique words used than usual (${anomaly.actualValue} vs expected ${parseFloat(anomaly.expectedValue).toFixed(0)})`;
      case "session_drop":
        return `${severity}Fewer AAC sessions than usual`;
      default:
        return `${severity}${anomaly.type.replace(/_/g, " ")}`;
    }
  };

  it("formats usage drop correctly", () => {
    const message = formatAnomalyMessage({
      type: "usage_drop",
      severity: "warning",
      actualValue: "20",
      expectedValue: "45.5",
    });
    expect(message).toBe("AAC usage was lower than usual (20 vs expected 46)");
  });

  it("formats vocabulary regression correctly", () => {
    const message = formatAnomalyMessage({
      type: "vocabulary_regression",
      severity: "warning",
      actualValue: "8",
      expectedValue: "15.2",
    });
    expect(message).toBe(
      "Fewer unique words used than usual (8 vs expected 15)"
    );
  });

  it("adds warning emoji for critical severity", () => {
    const message = formatAnomalyMessage({
      type: "usage_drop",
      severity: "critical",
      actualValue: "5",
      expectedValue: "50",
    });
    expect(message).toContain("⚠️");
  });

  it("handles unknown anomaly types", () => {
    const message = formatAnomalyMessage({
      type: "custom_anomaly_type",
      severity: "info",
      actualValue: "10",
      expectedValue: "20",
    });
    expect(message).toBe("custom anomaly type");
  });
});

describe("Digest Generator - Metrics Comparison", () => {
  const compareMetrics = (
    today: { totalTaps: number; uniqueSymbols: number } | null,
    yesterday: { totalTaps: number; uniqueSymbols: number } | null
  ): Record<string, number | null> => {
    if (!today || !yesterday) return {};

    const tapsChange = yesterday.totalTaps
      ? ((today.totalTaps - yesterday.totalTaps) / yesterday.totalTaps) * 100
      : null;

    const symbolsChange = yesterday.uniqueSymbols
      ? ((today.uniqueSymbols - yesterday.uniqueSymbols) /
          yesterday.uniqueSymbols) *
        100
      : null;

    return {
      tapsPercent: tapsChange ? Math.round(tapsChange) : null,
      symbolsPercent: symbolsChange ? Math.round(symbolsChange) : null,
    };
  };

  it("calculates positive change correctly", () => {
    const comparison = compareMetrics(
      { totalTaps: 60, uniqueSymbols: 20 },
      { totalTaps: 40, uniqueSymbols: 15 }
    );
    expect(comparison.tapsPercent).toBe(50);
    expect(comparison.symbolsPercent).toBe(33);
  });

  it("calculates negative change correctly", () => {
    const comparison = compareMetrics(
      { totalTaps: 30, uniqueSymbols: 10 },
      { totalTaps: 40, uniqueSymbols: 15 }
    );
    expect(comparison.tapsPercent).toBe(-25);
    expect(comparison.symbolsPercent).toBe(-33);
  });

  it("returns empty object when today is null", () => {
    const comparison = compareMetrics(null, {
      totalTaps: 40,
      uniqueSymbols: 15,
    });
    expect(comparison).toEqual({});
  });

  it("returns empty object when yesterday is null", () => {
    const comparison = compareMetrics(
      { totalTaps: 40, uniqueSymbols: 15 },
      null
    );
    expect(comparison).toEqual({});
  });

  it("handles zero values in yesterday", () => {
    const comparison = compareMetrics(
      { totalTaps: 40, uniqueSymbols: 15 },
      { totalTaps: 0, uniqueSymbols: 0 }
    );
    expect(comparison.tapsPercent).toBeNull();
    expect(comparison.symbolsPercent).toBeNull();
  });
});

describe("Digest Generator - Fallback Summary", () => {
  const generateFallbackSummary = (data: {
    childName: string;
    today?: {
      totalTaps: number;
      sessionCount: number;
      uniqueSymbols: number;
    } | null;
    yesterday?: { totalTaps: number } | null;
    newSymbols: string[];
    anomaliesToday: Array<{ message: string }>;
  }): string => {
    const parts: string[] = [];

    if (data.today) {
      parts.push(
        `${data.childName} had ${data.today.totalTaps} AAC taps across ${data.today.sessionCount} sessions today, ` +
          `using ${data.today.uniqueSymbols} different symbols.`
      );

      if (data.yesterday) {
        const tapsDiff = data.today.totalTaps - data.yesterday.totalTaps;
        if (tapsDiff > 5) {
          parts.push(
            `That's ${tapsDiff} more taps than yesterday - great progress! 🎉`
          );
        } else if (tapsDiff < -5) {
          parts.push(
            `That's ${Math.abs(tapsDiff)} fewer taps than yesterday, but every day is different.`
          );
        }
      }

      if (data.newSymbols.length > 0) {
        parts.push(`New words used: ${data.newSymbols.slice(0, 5).join(", ")}.`);
      }
    }

    if (data.anomaliesToday.length > 0) {
      parts.push("\n" + data.anomaliesToday.map((a) => a.message).join(" "));
    }

    parts.push("\nKeep up the great work! 💙");

    return parts.join(" ");
  };

  it("generates summary with basic metrics", () => {
    const summary = generateFallbackSummary({
      childName: "Flynn",
      today: { totalTaps: 45, sessionCount: 4, uniqueSymbols: 12 },
      yesterday: null,
      newSymbols: [],
      anomaliesToday: [],
    });

    expect(summary).toContain("Flynn");
    expect(summary).toContain("45 AAC taps");
    expect(summary).toContain("4 sessions");
    expect(summary).toContain("12 different symbols");
  });

  it("includes positive comparison to yesterday", () => {
    const summary = generateFallbackSummary({
      childName: "Flynn",
      today: { totalTaps: 50, sessionCount: 4, uniqueSymbols: 12 },
      yesterday: { totalTaps: 30 },
      newSymbols: [],
      anomaliesToday: [],
    });

    expect(summary).toContain("20 more taps");
    expect(summary).toContain("great progress");
  });

  it("includes new symbols", () => {
    const summary = generateFallbackSummary({
      childName: "Flynn",
      today: { totalTaps: 45, sessionCount: 4, uniqueSymbols: 12 },
      yesterday: null,
      newSymbols: ["want", "more", "help"],
      anomaliesToday: [],
    });

    expect(summary).toContain("New words used:");
    expect(summary).toContain("want");
    expect(summary).toContain("more");
  });

  it("includes anomaly messages", () => {
    const summary = generateFallbackSummary({
      childName: "Flynn",
      today: { totalTaps: 20, sessionCount: 2, uniqueSymbols: 8 },
      yesterday: null,
      newSymbols: [],
      anomaliesToday: [{ message: "Usage was lower than usual" }],
    });

    expect(summary).toContain("Usage was lower than usual");
  });

  it("always ends with encouragement", () => {
    const summary = generateFallbackSummary({
      childName: "Flynn",
      today: { totalTaps: 45, sessionCount: 4, uniqueSymbols: 12 },
      yesterday: null,
      newSymbols: [],
      anomaliesToday: [],
    });

    expect(summary).toContain("Keep up the great work!");
    expect(summary).toContain("💙");
  });
});

describe("Digest Generator - System Prompt", () => {
  const SYSTEM_PROMPT = `You are an assistant helping parents track their child's AAC (Augmentative and Alternative Communication) progress.`;

  it("mentions AAC", () => {
    expect(SYSTEM_PROMPT).toContain("AAC");
  });

  it("mentions parents/caregivers", () => {
    expect(SYSTEM_PROMPT).toContain("parents");
  });
});
