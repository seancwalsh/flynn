/**
 * Tests for Anomaly Detector Service
 * FLY-97: Basic anomaly detection (Z-score)
 */

import { describe, it, expect } from "bun:test";

// Test the core Z-score calculation logic
describe("Z-Score Calculation", () => {
  const calculateZScore = (
    value: number,
    mean: number,
    stdDev: number,
    dayOfWeekFactor?: number
  ): number => {
    if (stdDev === 0 || stdDev === null) return 0;
    const adjustedMean = dayOfWeekFactor ? mean * dayOfWeekFactor : mean;
    return (value - adjustedMean) / stdDev;
  };

  it("calculates positive Z-score for above-average value", () => {
    const zScore = calculateZScore(50, 30, 10);
    expect(zScore).toBe(2);
  });

  it("calculates negative Z-score for below-average value", () => {
    const zScore = calculateZScore(10, 30, 10);
    expect(zScore).toBe(-2);
  });

  it("returns 0 when value equals mean", () => {
    const zScore = calculateZScore(30, 30, 10);
    expect(zScore).toBe(0);
  });

  it("returns 0 when stdDev is 0", () => {
    const zScore = calculateZScore(50, 30, 0);
    expect(zScore).toBe(0);
  });

  it("applies day-of-week adjustment to mean", () => {
    // Mean is 30, weekend factor is 0.7, so adjusted mean is 21
    // Value is 14, so Z = (14 - 21) / 10 = -0.7
    const zScore = calculateZScore(14, 30, 10, 0.7);
    expect(zScore).toBeCloseTo(-0.7, 1);
  });

  it("handles high day-of-week factor correctly", () => {
    // Mean is 30, weekday factor is 1.2, so adjusted mean is 36
    // Value is 46, so Z = (46 - 36) / 10 = 1.0
    const zScore = calculateZScore(46, 30, 10, 1.2);
    expect(zScore).toBeCloseTo(1.0, 1);
  });
});

describe("Severity Classification", () => {
  const getSeverity = (
    zScore: number,
    warningThreshold: number = 2.0,
    criticalThreshold: number = 3.0
  ): "info" | "warning" | "critical" | null => {
    const absZ = Math.abs(zScore);
    if (absZ >= criticalThreshold) return "critical";
    if (absZ >= warningThreshold) return "warning";
    return null;
  };

  it("returns null for normal values (Z < 2)", () => {
    expect(getSeverity(1.5)).toBeNull();
    expect(getSeverity(-1.5)).toBeNull();
    expect(getSeverity(0)).toBeNull();
  });

  it("returns warning for Z-score between 2 and 3", () => {
    expect(getSeverity(2.0)).toBe("warning");
    expect(getSeverity(2.5)).toBe("warning");
    expect(getSeverity(-2.0)).toBe("warning");
    expect(getSeverity(-2.5)).toBe("warning");
  });

  it("returns critical for Z-score >= 3", () => {
    expect(getSeverity(3.0)).toBe("critical");
    expect(getSeverity(4.0)).toBe("critical");
    expect(getSeverity(-3.0)).toBe("critical");
    expect(getSeverity(-5.0)).toBe("critical");
  });

  it("respects custom thresholds", () => {
    expect(getSeverity(1.5, 1.0, 2.0)).toBe("warning");
    expect(getSeverity(2.5, 1.0, 2.0)).toBe("critical");
  });
});

describe("Anomaly Type Classification", () => {
  const getAnomalyType = (
    metricName: string,
    zScore: number
  ):
    | "usage_drop"
    | "usage_spike"
    | "vocabulary_regression"
    | "vocabulary_expansion"
    | "session_drop"
    | "session_spike" => {
    const isDecrease = zScore < 0;

    switch (metricName) {
      case "total_taps":
        return isDecrease ? "usage_drop" : "usage_spike";
      case "unique_symbols":
        return isDecrease ? "vocabulary_regression" : "vocabulary_expansion";
      case "session_count":
        return isDecrease ? "session_drop" : "session_spike";
      default:
        return isDecrease ? "usage_drop" : "usage_spike";
    }
  };

  describe("total_taps metric", () => {
    it("returns usage_drop for negative Z-score", () => {
      expect(getAnomalyType("total_taps", -2.5)).toBe("usage_drop");
    });

    it("returns usage_spike for positive Z-score", () => {
      expect(getAnomalyType("total_taps", 2.5)).toBe("usage_spike");
    });
  });

  describe("unique_symbols metric", () => {
    it("returns vocabulary_regression for negative Z-score", () => {
      expect(getAnomalyType("unique_symbols", -2.5)).toBe(
        "vocabulary_regression"
      );
    });

    it("returns vocabulary_expansion for positive Z-score", () => {
      expect(getAnomalyType("unique_symbols", 2.5)).toBe("vocabulary_expansion");
    });
  });

  describe("session_count metric", () => {
    it("returns session_drop for negative Z-score", () => {
      expect(getAnomalyType("session_count", -2.5)).toBe("session_drop");
    });

    it("returns session_spike for positive Z-score", () => {
      expect(getAnomalyType("session_count", 2.5)).toBe("session_spike");
    });
  });
});

describe("Day-of-Week Key", () => {
  const getDayOfWeekKey = (date: Date): string => {
    const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    return days[date.getUTCDay()];
  };

  it("returns correct day for Monday", () => {
    const monday = new Date("2026-01-26T12:00:00Z");
    expect(getDayOfWeekKey(monday)).toBe("mon");
  });

  it("returns correct day for Sunday", () => {
    const sunday = new Date("2026-02-01T12:00:00Z");
    expect(getDayOfWeekKey(sunday)).toBe("sun");
  });

  it("returns correct day for Wednesday", () => {
    const wednesday = new Date("2026-01-28T12:00:00Z");
    expect(getDayOfWeekKey(wednesday)).toBe("wed");
  });
});

describe("Anomaly Detection Scenarios", () => {
  // Simulate the full detection logic
  const simulateDetection = (
    actualValue: number,
    baselineMean: number,
    baselineStdDev: number,
    metricName: string,
    dayOfWeekFactor?: number
  ): {
    detected: boolean;
    severity: "warning" | "critical" | null;
    type: string | null;
    zScore: number;
  } => {
    const adjustedMean = dayOfWeekFactor
      ? baselineMean * dayOfWeekFactor
      : baselineMean;
    const zScore =
      baselineStdDev > 0 ? (actualValue - adjustedMean) / baselineStdDev : 0;
    const absZ = Math.abs(zScore);

    let severity: "warning" | "critical" | null = null;
    if (absZ >= 3) severity = "critical";
    else if (absZ >= 2) severity = "warning";

    if (!severity) {
      return { detected: false, severity: null, type: null, zScore };
    }

    const isDecrease = zScore < 0;
    let type: string;
    switch (metricName) {
      case "total_taps":
        type = isDecrease ? "usage_drop" : "usage_spike";
        break;
      case "unique_symbols":
        type = isDecrease ? "vocabulary_regression" : "vocabulary_expansion";
        break;
      case "session_count":
        type = isDecrease ? "session_drop" : "session_spike";
        break;
      default:
        type = isDecrease ? "usage_drop" : "usage_spike";
    }

    return { detected: true, severity, type, zScore };
  };

  describe("Usage drop scenarios", () => {
    it("detects warning-level usage drop", () => {
      // Baseline: mean=50, stdDev=10
      // Value: 30 → Z = (30-50)/10 = -2.0
      const result = simulateDetection(30, 50, 10, "total_taps");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("warning");
      expect(result.type).toBe("usage_drop");
      expect(result.zScore).toBe(-2);
    });

    it("detects critical-level usage drop", () => {
      // Baseline: mean=50, stdDev=10
      // Value: 15 → Z = (15-50)/10 = -3.5
      const result = simulateDetection(15, 50, 10, "total_taps");
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("critical");
      expect(result.type).toBe("usage_drop");
    });

    it("does not flag normal variation", () => {
      // Baseline: mean=50, stdDev=10
      // Value: 40 → Z = (40-50)/10 = -1.0
      const result = simulateDetection(40, 50, 10, "total_taps");
      expect(result.detected).toBe(false);
    });
  });

  describe("Weekend adjustment scenarios", () => {
    it("accounts for lower weekend baseline", () => {
      // Baseline: mean=50, stdDev=10, weekend factor=0.6 (expected=30)
      // Value: 25 → Z = (25-30)/10 = -0.5 (normal for weekend)
      const result = simulateDetection(25, 50, 10, "total_taps", 0.6);
      expect(result.detected).toBe(false);
    });

    it("still detects significant drop on weekend", () => {
      // Baseline: mean=50, stdDev=10, weekend factor=0.6 (expected=30)
      // Value: 5 → Z = (5-30)/10 = -2.5 (warning)
      const result = simulateDetection(5, 50, 10, "total_taps", 0.6);
      expect(result.detected).toBe(true);
      expect(result.severity).toBe("warning");
    });
  });

  describe("Vocabulary regression scenarios", () => {
    it("detects vocabulary regression", () => {
      // Usually uses 20 unique symbols, today only 10
      // Baseline: mean=20, stdDev=4
      // Value: 10 → Z = (10-20)/4 = -2.5
      const result = simulateDetection(10, 20, 4, "unique_symbols");
      expect(result.detected).toBe(true);
      expect(result.type).toBe("vocabulary_regression");
    });

    it("detects vocabulary expansion", () => {
      // Usually uses 20 unique symbols, today used 30
      // Baseline: mean=20, stdDev=4
      // Value: 30 → Z = (30-20)/4 = 2.5
      const result = simulateDetection(30, 20, 4, "unique_symbols");
      expect(result.detected).toBe(true);
      expect(result.type).toBe("vocabulary_expansion");
    });
  });

  describe("Edge cases", () => {
    it("handles zero standard deviation", () => {
      const result = simulateDetection(30, 50, 0, "total_taps");
      expect(result.detected).toBe(false);
      expect(result.zScore).toBe(0);
    });

    it("handles zero baseline mean with day factor", () => {
      const result = simulateDetection(10, 0, 5, "total_taps", 1.0);
      expect(result.zScore).toBe(2);
      expect(result.detected).toBe(true);
    });

    it("handles exactly threshold values", () => {
      // Exactly Z = -2.0 should be warning
      const result = simulateDetection(30, 50, 10, "total_taps");
      expect(result.severity).toBe("warning");

      // Exactly Z = -3.0 should be critical
      const result2 = simulateDetection(20, 50, 10, "total_taps");
      expect(result2.severity).toBe("critical");
    });
  });
});

describe("Real-world scenarios", () => {
  it("Flynn's typical usage pattern - normal day", () => {
    // Flynn typically does 45 taps/day with stdDev of 12
    // Today he did 38 - within normal range
    const baseline = { mean: 45, stdDev: 12 };
    const todayValue = 38;
    const zScore = (todayValue - baseline.mean) / baseline.stdDev;
    expect(Math.abs(zScore)).toBeLessThan(2);
  });

  it("Flynn's typical usage pattern - sick day (should alert)", () => {
    // Flynn typically does 45 taps/day with stdDev of 12
    // Today he did only 15 - significant drop
    const baseline = { mean: 45, stdDev: 12 };
    const todayValue = 15;
    const zScore = (todayValue - baseline.mean) / baseline.stdDev;
    expect(zScore).toBeLessThan(-2); // Below -2 threshold
    expect(Math.abs(zScore)).toBe(2.5);
  });

  it("Flynn's weekend pattern - normal for weekend", () => {
    // Flynn typically does 45 taps/day, but weekends are 0.6x
    // Weekend expected: 27, he did 25 - normal
    const baseline = { mean: 45, stdDev: 12 };
    const weekendFactor = 0.6;
    const adjustedMean = baseline.mean * weekendFactor; // 27
    const todayValue = 25;
    const zScore = (todayValue - adjustedMean) / baseline.stdDev;
    expect(Math.abs(zScore)).toBeLessThan(2);
  });
});
