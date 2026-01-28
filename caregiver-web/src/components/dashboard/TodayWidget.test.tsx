/**
 * Tests for TodayWidget Component
 * 
 * Tests the today's activity widget with various states:
 * - Loading state
 * - With activity data
 * - Empty state (no activity)
 * - With observation
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodayWidget } from "./TodayWidget";
import type { TodayStats } from "./types";

describe("TodayWidget", () => {
  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  describe("Loading State", () => {
    it("shows loading skeleton when isLoading is true", () => {
      render(<TodayWidget stats={null} isLoading={true} />);

      // Should show animated skeleton elements
      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not show stats while loading", () => {
      render(<TodayWidget stats={null} isLoading={true} />);

      expect(screen.queryByText("sessions")).not.toBeInTheDocument();
      expect(screen.queryByText("words used")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // WITH DATA
  // ==========================================================================

  describe("With Activity Data", () => {
    const mockStats: TodayStats = {
      sessionsLogged: 3,
      wordsUsed: 47,
      communicationAttempts: 12,
    };

    it("displays the Today header", () => {
      render(<TodayWidget stats={mockStats} />);

      expect(screen.getByText("Today")).toBeInTheDocument();
    });

    it("displays session count", () => {
      render(<TodayWidget stats={mockStats} />);

      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("sessions")).toBeInTheDocument();
    });

    it("displays words used count", () => {
      render(<TodayWidget stats={mockStats} />);

      expect(screen.getByText("47")).toBeInTheDocument();
      expect(screen.getByText("words used")).toBeInTheDocument();
    });

    it("displays communication attempts when present", () => {
      render(<TodayWidget stats={mockStats} />);

      expect(screen.getByText("12")).toBeInTheDocument();
      expect(screen.getByText("Communication attempts")).toBeInTheDocument();
    });

    it("hides communication attempts when zero", () => {
      const statsWithZeroAttempts: TodayStats = {
        ...mockStats,
        communicationAttempts: 0,
      };

      render(<TodayWidget stats={statsWithZeroAttempts} />);

      expect(screen.queryByText("Communication attempts")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // WITH OBSERVATION
  // ==========================================================================

  describe("With Observation", () => {
    it("displays the LLM observation when present", () => {
      const statsWithObservation: TodayStats = {
        sessionsLogged: 3,
        wordsUsed: 47,
        communicationAttempts: 12,
        observation: "More spontaneous requests today",
      };

      render(<TodayWidget stats={statsWithObservation} />);

      expect(screen.getByText(/"More spontaneous requests today"/)).toBeInTheDocument();
    });

    it("does not show observation section when not present", () => {
      const statsWithoutObservation: TodayStats = {
        sessionsLogged: 3,
        wordsUsed: 47,
        communicationAttempts: 12,
      };

      render(<TodayWidget stats={statsWithoutObservation} />);

      // Should not have any italic text with quotes
      const quotedText = document.querySelector("p.italic");
      expect(quotedText).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EMPTY STATE
  // ==========================================================================

  describe("Empty State", () => {
    it("shows empty message when no activity", () => {
      const emptyStats: TodayStats = {
        sessionsLogged: 0,
        wordsUsed: 0,
        communicationAttempts: 0,
      };

      render(<TodayWidget stats={emptyStats} />);

      expect(screen.getByText("No activity logged today")).toBeInTheDocument();
    });

    it("shows helpful hint in empty state", () => {
      const emptyStats: TodayStats = {
        sessionsLogged: 0,
        wordsUsed: 0,
        communicationAttempts: 0,
      };

      render(<TodayWidget stats={emptyStats} />);

      expect(screen.getByText(/Sessions will appear here/)).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // NULL STATE
  // ==========================================================================

  describe("Null Stats", () => {
    it("shows empty state when stats is null", () => {
      render(<TodayWidget stats={null} />);

      expect(screen.getByText("No activity logged today")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // STYLING
  // ==========================================================================

  describe("Styling", () => {
    it("applies custom className", () => {
      const mockStats: TodayStats = {
        sessionsLogged: 3,
        wordsUsed: 47,
        communicationAttempts: 12,
      };

      const { container } = render(
        <TodayWidget stats={mockStats} className="custom-class" />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });

    it("has rounded corners and shadow", () => {
      const mockStats: TodayStats = {
        sessionsLogged: 3,
        wordsUsed: 47,
        communicationAttempts: 0,
      };

      const { container } = render(<TodayWidget stats={mockStats} />);

      expect(container.firstChild).toHaveClass("rounded-2xl");
      expect(container.firstChild).toHaveClass("shadow-sm");
    });
  });
});
