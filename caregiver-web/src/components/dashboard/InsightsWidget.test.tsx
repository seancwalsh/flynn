/**
 * Tests for InsightsWidget Component
 * 
 * Tests the insights widget with various states:
 * - Loading state
 * - With insights
 * - Empty state
 * - Different insight types
 * - Interaction (ask about insight)
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InsightsWidget } from "./InsightsWidget";

const mockInsights = [
  {
    id: "1",
    type: "trend_up" as const,
    title: "Speech variety up 15%",
    description: "Flynn used more unique words this week compared to last week",
    timestamp: new Date(),
  },
  {
    id: "2",
    type: "alert" as const,
    title: "Usage Drop Detected",
    description: "Communication frequency decreased by 20% this week",
    timestamp: new Date(),
  },
  {
    id: "3",
    type: "milestone" as const,
    title: "New 3-Word Phrases!",
    description: "First time combining 3 words consistently",
    timestamp: new Date(),
  },
];

describe("InsightsWidget", () => {
  // ==========================================================================
  // LOADING STATE
  // ==========================================================================

  describe("Loading State", () => {
    it("shows loading skeleton when isLoading is true", () => {
      render(<InsightsWidget childId="child-1" insights={[]} isLoading={true} />);

      const skeleton = document.querySelector(".animate-pulse");
      expect(skeleton).toBeInTheDocument();
    });

    it("does not show insights while loading", () => {
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={mockInsights} 
          isLoading={true} 
        />
      );

      expect(screen.queryByText("Speech variety up 15%")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // WITH INSIGHTS
  // ==========================================================================

  describe("With Insights", () => {
    it("displays the Insights header", () => {
      render(<InsightsWidget childId="child-1" insights={mockInsights} />);

      expect(screen.getByText("Insights")).toBeInTheDocument();
    });

    it("displays up to 3 insights", () => {
      render(<InsightsWidget childId="child-1" insights={mockInsights} />);

      expect(screen.getByText("Speech variety up 15%")).toBeInTheDocument();
      expect(screen.getByText("Usage Drop Detected")).toBeInTheDocument();
      expect(screen.getByText("New 3-Word Phrases!")).toBeInTheDocument();
    });

    it("shows descriptions for insights", () => {
      render(<InsightsWidget childId="child-1" insights={mockInsights} />);

      expect(
        screen.getByText(/Flynn used more unique words this week/)
      ).toBeInTheDocument();
    });

    it("shows View all button when more than 3 insights", () => {
      const manyInsights = [
        ...mockInsights,
        {
          id: "4",
          type: "suggestion" as const,
          title: "Fourth insight",
          description: "Description",
          timestamp: new Date(),
        },
      ];

      const onViewAll = vi.fn();
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={manyInsights} 
          onViewAll={onViewAll}
        />
      );

      expect(screen.getByText("View all")).toBeInTheDocument();
    });

    it("hides View all when 3 or fewer insights", () => {
      const onViewAll = vi.fn();
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={mockInsights.slice(0, 2)} 
          onViewAll={onViewAll}
        />
      );

      expect(screen.queryByText("View all")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // INSIGHT TYPES & STYLING
  // ==========================================================================

  describe("Insight Types", () => {
    it("applies correct styling for trend_up insights", () => {
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={[mockInsights[0]]} 
        />
      );

      // The InsightCard has the bg color on the outermost div
      const title = screen.getByText("Speech variety up 15%");
      // Go up: p -> div.flex-1 -> div.flex -> div.p-3 (with bg color)
      const cardContainer = title.closest(".p-3");
      expect(cardContainer).toHaveClass("bg-green-50");
    });

    it("applies correct styling for alert insights", () => {
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={[mockInsights[1]]} 
        />
      );

      const title = screen.getByText("Usage Drop Detected");
      const cardContainer = title.closest(".p-3");
      expect(cardContainer).toHaveClass("bg-amber-50");
    });

    it("applies correct styling for milestone insights", () => {
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={[mockInsights[2]]} 
        />
      );

      const title = screen.getByText("New 3-Word Phrases!");
      const cardContainer = title.closest(".p-3");
      expect(cardContainer).toHaveClass("bg-purple-50");
    });
  });

  // ==========================================================================
  // INTERACTIONS
  // ==========================================================================

  describe("Interactions", () => {
    it("calls onAskAbout when Ask about this is clicked", () => {
      const onAskAbout = vi.fn();
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={mockInsights.slice(0, 1)} 
          onAskAbout={onAskAbout}
        />
      );

      const askButton = screen.getByText("Ask about this");
      fireEvent.click(askButton);

      expect(onAskAbout).toHaveBeenCalledWith(mockInsights[0]);
    });

    it("calls onViewAll when View all is clicked", () => {
      const onViewAll = vi.fn();
      const manyInsights = [
        ...mockInsights,
        {
          id: "4",
          type: "suggestion" as const,
          title: "Fourth",
          description: "Desc",
          timestamp: new Date(),
        },
      ];

      render(
        <InsightsWidget 
          childId="child-1" 
          insights={manyInsights}
          onViewAll={onViewAll}
        />
      );

      const viewAllButton = screen.getByText("View all");
      fireEvent.click(viewAllButton);

      expect(onViewAll).toHaveBeenCalled();
    });

    it("does not show Ask button when onAskAbout not provided", () => {
      render(
        <InsightsWidget 
          childId="child-1" 
          insights={mockInsights.slice(0, 1)} 
        />
      );

      expect(screen.queryByText("Ask about this")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EMPTY STATE
  // ==========================================================================

  describe("Empty State", () => {
    it("shows empty message when no insights", () => {
      render(<InsightsWidget childId="child-1" insights={[]} />);

      expect(screen.getByText("No insights yet")).toBeInTheDocument();
    });

    it("shows helpful hint in empty state", () => {
      render(<InsightsWidget childId="child-1" insights={[]} />);

      expect(
        screen.getByText(/Insights will appear as we analyze activity/)
      ).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // STYLING
  // ==========================================================================

  describe("Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <InsightsWidget 
          childId="child-1" 
          insights={mockInsights} 
          className="custom-class" 
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
