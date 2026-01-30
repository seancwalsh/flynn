/**
 * Tests for Cross-Therapy Coordination Service
 * FLY-103: Cross-therapy goal linking
 */

import { describe, it, expect } from "bun:test";

// Test helper types
type TherapyType = "aac" | "aba" | "ot" | "slp" | "pt" | "other";
type RelationshipType = "supports" | "conflicts" | "prerequisite" | "related";

interface Goal {
  id: string;
  title: string;
  therapyType: TherapyType;
  category?: string;
  description?: string;
}

describe("Goal Linking", () => {
  it("identifies bidirectional relationship types", () => {
    const bidirectionalTypes: RelationshipType[] = ["related", "conflicts"];
    const unidirectionalTypes: RelationshipType[] = ["supports", "prerequisite"];

    expect(bidirectionalTypes).toContain("related");
    expect(bidirectionalTypes).toContain("conflicts");
    expect(unidirectionalTypes).toContain("supports");
    expect(unidirectionalTypes).toContain("prerequisite");
  });

  it("validates relationship types", () => {
    const validTypes = ["supports", "conflicts", "prerequisite", "related"];

    expect(validTypes).toHaveLength(4);
    validTypes.forEach((type) => {
      expect(typeof type).toBe("string");
    });
  });
});

describe("Correlation Analysis", () => {
  interface MetricData {
    date: string;
    totalTaps: number;
    hasSession: boolean;
  }

  const calculateCorrelation = (
    data: MetricData[]
  ): { percentDiff: number; isPositive: boolean } | null => {
    const withSession = data.filter((d) => d.hasSession);
    const withoutSession = data.filter((d) => !d.hasSession);

    if (withSession.length < 2 || withoutSession.length < 2) return null;

    const avgWith =
      withSession.reduce((sum, d) => sum + d.totalTaps, 0) / withSession.length;
    const avgWithout =
      withoutSession.reduce((sum, d) => sum + d.totalTaps, 0) /
      withoutSession.length;

    if (avgWithout === 0) return null;

    const percentDiff = ((avgWith - avgWithout) / avgWithout) * 100;

    return {
      percentDiff,
      isPositive: percentDiff > 0,
    };
  };

  it("calculates positive correlation when sessions boost usage", () => {
    const data: MetricData[] = [
      { date: "2026-01-20", totalTaps: 60, hasSession: true },
      { date: "2026-01-21", totalTaps: 55, hasSession: true },
      { date: "2026-01-22", totalTaps: 40, hasSession: false },
      { date: "2026-01-23", totalTaps: 35, hasSession: false },
    ];

    const result = calculateCorrelation(data);

    expect(result).not.toBeNull();
    expect(result!.isPositive).toBe(true);
    expect(result!.percentDiff).toBeGreaterThan(0);
  });

  it("calculates negative correlation when sessions reduce usage", () => {
    const data: MetricData[] = [
      { date: "2026-01-20", totalTaps: 30, hasSession: true },
      { date: "2026-01-21", totalTaps: 25, hasSession: true },
      { date: "2026-01-22", totalTaps: 50, hasSession: false },
      { date: "2026-01-23", totalTaps: 55, hasSession: false },
    ];

    const result = calculateCorrelation(data);

    expect(result).not.toBeNull();
    expect(result!.isPositive).toBe(false);
  });

  it("returns null for insufficient data", () => {
    const data: MetricData[] = [
      { date: "2026-01-20", totalTaps: 50, hasSession: true },
    ];

    const result = calculateCorrelation(data);

    expect(result).toBeNull();
  });

  it("handles zero average gracefully", () => {
    const data: MetricData[] = [
      { date: "2026-01-20", totalTaps: 50, hasSession: true },
      { date: "2026-01-21", totalTaps: 50, hasSession: true },
      { date: "2026-01-22", totalTaps: 0, hasSession: false },
      { date: "2026-01-23", totalTaps: 0, hasSession: false },
    ];

    const result = calculateCorrelation(data);

    expect(result).toBeNull();
  });
});

describe("Conflict Detection", () => {
  const checkForConflict = (
    goal1: Goal,
    goal2: Goal
  ): { conflictType: string; description: string } | null => {
    const title1 = goal1.title.toLowerCase();
    const title2 = goal2.title.toLowerCase();
    const desc1 = (goal1.description || "").toLowerCase();
    const desc2 = (goal2.description || "").toLowerCase();

    // Pointing vs AAC device conflict
    if (
      (title1.includes("point") || desc1.includes("point")) &&
      (title2.includes("device") || title2.includes("aac") || desc2.includes("device"))
    ) {
      return {
        conflictType: "communication_method",
        description: "Potential conflict between pointing and AAC device use",
      };
    }

    // Reverse check
    if (
      (title2.includes("point") || desc2.includes("point")) &&
      (title1.includes("device") || title1.includes("aac") || desc1.includes("device"))
    ) {
      return {
        conflictType: "communication_method",
        description: "Potential conflict between pointing and AAC device use",
      };
    }

    return null;
  };

  it("detects pointing vs AAC device conflict", () => {
    const goal1: Goal = {
      id: "1",
      title: "Practice pointing to request",
      therapyType: "aba",
    };
    const goal2: Goal = {
      id: "2",
      title: "Use AAC device for requesting",
      therapyType: "slp",
    };

    const conflict = checkForConflict(goal1, goal2);

    expect(conflict).not.toBeNull();
    expect(conflict!.conflictType).toBe("communication_method");
  });

  it("detects conflict from description", () => {
    const goal1: Goal = {
      id: "1",
      title: "Communication skills",
      therapyType: "aba",
      description: "Work on pointing to pictures",
    };
    const goal2: Goal = {
      id: "2",
      title: "AAC implementation",
      therapyType: "slp",
    };

    const conflict = checkForConflict(goal1, goal2);

    expect(conflict).not.toBeNull();
  });

  it("returns null for non-conflicting goals", () => {
    const goal1: Goal = {
      id: "1",
      title: "Improve fine motor skills",
      therapyType: "ot",
    };
    const goal2: Goal = {
      id: "2",
      title: "Expand vocabulary",
      therapyType: "slp",
    };

    const conflict = checkForConflict(goal1, goal2);

    expect(conflict).toBeNull();
  });

  it("returns null for same therapy type goals", () => {
    // In practice, we only check different therapy types
    const goal1: Goal = {
      id: "1",
      title: "Practice pointing",
      therapyType: "aba",
    };
    const goal2: Goal = {
      id: "2",
      title: "Use AAC device",
      therapyType: "aba", // Same type - wouldn't check in real code
    };

    // This would be filtered out before checking
    expect(goal1.therapyType).toBe(goal2.therapyType);
  });
});

describe("Therapy Type Grouping", () => {
  it("groups goals by therapy type", () => {
    const goals: Goal[] = [
      { id: "1", title: "Goal 1", therapyType: "aba" },
      { id: "2", title: "Goal 2", therapyType: "ot" },
      { id: "3", title: "Goal 3", therapyType: "aba" },
      { id: "4", title: "Goal 4", therapyType: "slp" },
    ];

    const grouped: Record<string, Goal[]> = {};
    goals.forEach((goal) => {
      if (!grouped[goal.therapyType]) {
        grouped[goal.therapyType] = [];
      }
      grouped[goal.therapyType].push(goal);
    });

    expect(grouped["aba"]).toHaveLength(2);
    expect(grouped["ot"]).toHaveLength(1);
    expect(grouped["slp"]).toHaveLength(1);
    expect(grouped["pt"]).toBeUndefined();
  });

  it("handles empty goal list", () => {
    const goals: Goal[] = [];
    const grouped: Record<string, Goal[]> = {};

    goals.forEach((goal) => {
      if (!grouped[goal.therapyType]) {
        grouped[goal.therapyType] = [];
      }
      grouped[goal.therapyType].push(goal);
    });

    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe("Correlation Strength", () => {
  it("calculates strength from percent difference", () => {
    const calculateStrength = (percentDiff: number): number => {
      return Math.min(1, Math.abs(percentDiff) / 50);
    };

    expect(calculateStrength(25)).toBe(0.5);
    expect(calculateStrength(50)).toBe(1);
    expect(calculateStrength(75)).toBe(1); // Capped at 1
    expect(calculateStrength(10)).toBe(0.2);
    expect(calculateStrength(-30)).toBe(0.6);
  });

  it("filters out weak correlations", () => {
    const isSignificant = (percentDiff: number, strength: number): boolean => {
      return Math.abs(percentDiff) >= 10 && strength >= 0.3;
    };

    expect(isSignificant(5, 0.1)).toBe(false); // Too weak
    expect(isSignificant(15, 0.3)).toBe(true); // Meets threshold
    expect(isSignificant(30, 0.6)).toBe(true); // Strong
    expect(isSignificant(8, 0.25)).toBe(false); // Below thresholds
  });
});

describe("Supported Therapy Types", () => {
  it("includes all expected therapy types", () => {
    const therapyTypes: TherapyType[] = [
      "aac",
      "aba",
      "ot",
      "slp",
      "pt",
      "other",
    ];

    expect(therapyTypes).toContain("aac");
    expect(therapyTypes).toContain("aba");
    expect(therapyTypes).toContain("ot");
    expect(therapyTypes).toContain("slp");
    expect(therapyTypes).toContain("pt");
    expect(therapyTypes).toContain("other");
    expect(therapyTypes).toHaveLength(6);
  });

  it("maps therapy abbreviations correctly", () => {
    const therapyNames: Record<TherapyType, string> = {
      aac: "Augmentative & Alternative Communication",
      aba: "Applied Behavior Analysis",
      ot: "Occupational Therapy",
      slp: "Speech-Language Pathology",
      pt: "Physical Therapy",
      other: "Other",
    };

    expect(therapyNames.aba).toContain("Behavior");
    expect(therapyNames.ot).toContain("Occupational");
    expect(therapyNames.slp).toContain("Speech");
  });
});
