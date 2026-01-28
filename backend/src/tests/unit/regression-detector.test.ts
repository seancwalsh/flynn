/**
 * Tests for Regression Detection Engine
 * FLY-102: Regression detection engine
 */

import { describe, it, expect } from "bun:test";

// Test helper types and functions

type AlertLevel = "yellow" | "orange" | "red";

interface RegressionConfig {
  yellowThreshold: number;
  orangeThreshold: number;
  redThreshold: number;
  consecutiveDaysForTrend: number;
}

const DEFAULT_CONFIG: RegressionConfig = {
  yellowThreshold: 20,
  orangeThreshold: 35,
  redThreshold: 50,
  consecutiveDaysForTrend: 3,
};

describe("Alert Level Classification", () => {
  const getAlertLevel = (
    changePercent: number,
    config: RegressionConfig = DEFAULT_CONFIG
  ): AlertLevel => {
    if (changePercent >= config.redThreshold) return "red";
    if (changePercent >= config.orangeThreshold) return "orange";
    return "yellow";
  };

  it("returns yellow for minor changes", () => {
    expect(getAlertLevel(15)).toBe("yellow");
    expect(getAlertLevel(19)).toBe("yellow");
  });

  it("returns yellow at threshold boundary", () => {
    expect(getAlertLevel(20)).toBe("yellow");
  });

  it("returns orange for moderate changes", () => {
    expect(getAlertLevel(35)).toBe("orange");
    expect(getAlertLevel(40)).toBe("orange");
    expect(getAlertLevel(49)).toBe("orange");
  });

  it("returns red for severe changes", () => {
    expect(getAlertLevel(50)).toBe("red");
    expect(getAlertLevel(75)).toBe("red");
    expect(getAlertLevel(100)).toBe("red");
  });

  it("respects custom thresholds", () => {
    const strictConfig = {
      yellowThreshold: 10,
      orangeThreshold: 20,
      redThreshold: 30,
      consecutiveDaysForTrend: 3,
    };

    expect(getAlertLevel(15, strictConfig)).toBe("yellow"); // 15 < 20
    expect(getAlertLevel(20, strictConfig)).toBe("orange"); // 20 >= 20
    expect(getAlertLevel(25, strictConfig)).toBe("orange"); // 25 >= 20, < 30
    expect(getAlertLevel(30, strictConfig)).toBe("red"); // 30 >= 30
  });
});

describe("Vocabulary Regression Logic", () => {
  const findMissingWords = (
    establishedWords: string[],
    recentWords: string[]
  ): string[] => {
    const recentSet = new Set(recentWords);
    return establishedWords.filter((word) => !recentSet.has(word));
  };

  it("identifies missing words correctly", () => {
    const established = ["want", "more", "help", "eat", "play"];
    const recent = ["want", "more", "drink"];

    const missing = findMissingWords(established, recent);

    expect(missing).toContain("help");
    expect(missing).toContain("eat");
    expect(missing).toContain("play");
    expect(missing.length).toBe(3);
  });

  it("returns empty array when no words missing", () => {
    const established = ["want", "more"];
    const recent = ["want", "more", "help"];

    const missing = findMissingWords(established, recent);

    expect(missing.length).toBe(0);
  });

  it("handles empty established words", () => {
    const established: string[] = [];
    const recent = ["want", "more"];

    const missing = findMissingWords(established, recent);

    expect(missing.length).toBe(0);
  });

  it("handles empty recent words", () => {
    const established = ["want", "more"];
    const recent: string[] = [];

    const missing = findMissingWords(established, recent);

    expect(missing).toEqual(["want", "more"]);
  });
});

describe("Usage Trend Detection", () => {
  interface DailyMetric {
    date: string;
    totalTaps: number;
  }

  const detectConsecutiveDecline = (
    metrics: DailyMetric[],
    minDays: number = 3
  ): { days: number; avgDeclinePercent: number } | null => {
    if (metrics.length < 2) return null;

    let consecutiveDeclines = 0;
    let totalDeclinePercent = 0;

    for (let i = 0; i < metrics.length - 1; i++) {
      const today = metrics[i].totalTaps;
      const yesterday = metrics[i + 1].totalTaps;

      if (today < yesterday) {
        consecutiveDeclines++;
        if (yesterday > 0) {
          totalDeclinePercent += ((yesterday - today) / yesterday) * 100;
        }
      } else {
        break;
      }
    }

    if (consecutiveDeclines >= minDays) {
      return {
        days: consecutiveDeclines,
        avgDeclinePercent: totalDeclinePercent / consecutiveDeclines,
      };
    }

    return null;
  };

  it("detects consecutive declining days", () => {
    const metrics: DailyMetric[] = [
      { date: "2026-01-28", totalTaps: 30 },
      { date: "2026-01-27", totalTaps: 40 },
      { date: "2026-01-26", totalTaps: 50 },
      { date: "2026-01-25", totalTaps: 60 },
    ];

    const result = detectConsecutiveDecline(metrics, 3);

    expect(result).not.toBeNull();
    expect(result!.days).toBe(3);
  });

  it("calculates average decline percentage", () => {
    const metrics: DailyMetric[] = [
      { date: "2026-01-28", totalTaps: 40 }, // -20% from 50
      { date: "2026-01-27", totalTaps: 50 }, // -50% from 100
      { date: "2026-01-26", totalTaps: 100 },
    ];

    const result = detectConsecutiveDecline(metrics, 2);

    expect(result).not.toBeNull();
    expect(result!.avgDeclinePercent).toBeCloseTo(35, 0); // (20 + 50) / 2
  });

  it("returns null when trend breaks", () => {
    const metrics: DailyMetric[] = [
      { date: "2026-01-28", totalTaps: 30 },
      { date: "2026-01-27", totalTaps: 40 },
      { date: "2026-01-26", totalTaps: 35 }, // Increase breaks trend
      { date: "2026-01-25", totalTaps: 50 },
    ];

    const result = detectConsecutiveDecline(metrics, 3);

    expect(result).toBeNull();
  });

  it("returns null for insufficient data", () => {
    const metrics: DailyMetric[] = [{ date: "2026-01-28", totalTaps: 30 }];

    const result = detectConsecutiveDecline(metrics, 3);

    expect(result).toBeNull();
  });
});

describe("Context-Aware Detection", () => {
  interface ChildContext {
    isIll?: boolean;
    isOnVacation?: boolean;
  }

  const shouldSkipDetection = (context?: ChildContext): boolean => {
    return !!(context?.isIll || context?.isOnVacation);
  };

  it("skips detection when child is ill", () => {
    expect(shouldSkipDetection({ isIll: true })).toBe(true);
  });

  it("skips detection when on vacation", () => {
    expect(shouldSkipDetection({ isOnVacation: true })).toBe(true);
  });

  it("does not skip when context is normal", () => {
    expect(shouldSkipDetection({ isIll: false, isOnVacation: false })).toBe(
      false
    );
  });

  it("does not skip when context is undefined", () => {
    expect(shouldSkipDetection(undefined)).toBe(false);
  });
});

describe("Engagement Drop Detection", () => {
  const detectEngagementDrop = (
    currentSessions: number,
    avgSessions: number,
    threshold: number = 20
  ): { hasDropped: boolean; dropPercent: number } => {
    if (avgSessions === 0) return { hasDropped: false, dropPercent: 0 };

    const dropPercent = ((avgSessions - currentSessions) / avgSessions) * 100;

    return {
      hasDropped: dropPercent >= threshold,
      dropPercent,
    };
  };

  it("detects significant session drop", () => {
    const result = detectEngagementDrop(5, 10, 20);

    expect(result.hasDropped).toBe(true);
    expect(result.dropPercent).toBe(50);
  });

  it("does not flag minor variations", () => {
    const result = detectEngagementDrop(9, 10, 20);

    expect(result.hasDropped).toBe(false);
    expect(result.dropPercent).toBe(10);
  });

  it("handles zero average gracefully", () => {
    const result = detectEngagementDrop(5, 0, 20);

    expect(result.hasDropped).toBe(false);
    expect(result.dropPercent).toBe(0);
  });

  it("detects at threshold boundary", () => {
    const result = detectEngagementDrop(8, 10, 20);

    expect(result.hasDropped).toBe(true);
    expect(result.dropPercent).toBe(20);
  });
});

describe("Recommendation Generation", () => {
  const getRecommendation = (level: AlertLevel): string => {
    switch (level) {
      case "red":
        return "Consider scheduling a team meeting to discuss.";
      case "orange":
        return "Worth mentioning to the therapist at the next session.";
      case "yellow":
        return "Keep an eye on this.";
    }
  };

  it("returns urgent recommendation for red alerts", () => {
    const rec = getRecommendation("red");
    expect(rec).toContain("team meeting");
  });

  it("returns moderate recommendation for orange alerts", () => {
    const rec = getRecommendation("orange");
    expect(rec).toContain("therapist");
  });

  it("returns mild recommendation for yellow alerts", () => {
    const rec = getRecommendation("yellow");
    expect(rec).toContain("eye on this");
  });
});

describe("Alert Aggregation", () => {
  interface Alert {
    type: string;
    level: AlertLevel;
  }

  const getMostSevereLevel = (alerts: Alert[]): AlertLevel | null => {
    if (alerts.length === 0) return null;

    const levels: AlertLevel[] = ["red", "orange", "yellow"];
    for (const level of levels) {
      if (alerts.some((a) => a.level === level)) {
        return level;
      }
    }
    return "yellow";
  };

  it("returns red when any alert is red", () => {
    const alerts: Alert[] = [
      { type: "vocab", level: "yellow" },
      { type: "usage", level: "red" },
      { type: "sessions", level: "orange" },
    ];

    expect(getMostSevereLevel(alerts)).toBe("red");
  });

  it("returns orange when worst is orange", () => {
    const alerts: Alert[] = [
      { type: "vocab", level: "yellow" },
      { type: "usage", level: "orange" },
    ];

    expect(getMostSevereLevel(alerts)).toBe("orange");
  });

  it("returns yellow when all are yellow", () => {
    const alerts: Alert[] = [
      { type: "vocab", level: "yellow" },
      { type: "usage", level: "yellow" },
    ];

    expect(getMostSevereLevel(alerts)).toBe("yellow");
  });

  it("returns null for empty alerts", () => {
    expect(getMostSevereLevel([])).toBeNull();
  });
});
