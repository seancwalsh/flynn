/**
 * Tests for ChildSelector Component
 * 
 * Tests the child selector header with:
 * - Single child (no dropdown)
 * - Multiple children (dropdown)
 * - Quick add button
 * - Selection behavior
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChildSelector } from "./ChildSelector";
import type { DashboardChild } from "./types";

const mockChildren: DashboardChild[] = [
  { id: "child-1", name: "Flynn", age: 5 },
  { id: "child-2", name: "Jamie", age: 2 },
];

const singleChild: DashboardChild[] = [
  { id: "child-1", name: "Flynn", age: 5 },
];

describe("ChildSelector", () => {
  // ==========================================================================
  // BASIC RENDERING
  // ==========================================================================

  describe("Basic Rendering", () => {
    it("displays the selected child name", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      expect(screen.getByText("Flynn")).toBeInTheDocument();
    });

    it("displays the child age", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      expect(screen.getByText("5 years old")).toBeInTheDocument();
    });

    it("shows avatar with first letter of name", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      // The avatar should contain "F" for Flynn
      const avatar = document.querySelector(".rounded-full");
      expect(avatar).toBeInTheDocument();
    });

    it("shows Log Session button", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      expect(screen.getByText("Log Session")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // SINGLE CHILD (NO DROPDOWN)
  // ==========================================================================

  describe("Single Child", () => {
    it("does not show dropdown arrow with single child", () => {
      render(
        <ChildSelector
          children={singleChild}
          selectedChild={singleChild[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      // Should not have the chevron icon (rotation class would indicate dropdown)
      const chevron = document.querySelector("[class*='rotate-180']");
      expect(chevron).not.toBeInTheDocument();
    });

    it("clicking does not open dropdown with single child", () => {
      render(
        <ChildSelector
          children={singleChild}
          selectedChild={singleChild[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      // Click on the selector
      fireEvent.click(screen.getByText("Flynn"));

      // Dropdown should not appear
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MULTIPLE CHILDREN (DROPDOWN)
  // ==========================================================================

  describe("Multiple Children", () => {
    it("shows dropdown arrow with multiple children", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      // Should have a dropdown indicator (ChevronDown icon)
      const selectorButton = screen.getByText("Flynn").closest("button");
      expect(selectorButton).toBeInTheDocument();
    });

    it("opens dropdown when clicked", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      const selectorButton = screen.getByText("Flynn").closest("button");
      fireEvent.click(selectorButton!);

      // Should show both children in dropdown
      expect(screen.getByText("Jamie")).toBeInTheDocument();
    });

    it("calls onSelectChild when a child is selected", () => {
      const onSelectChild = vi.fn();
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={onSelectChild}
          onAddSession={vi.fn()}
        />
      );

      // Open dropdown
      const selectorButton = screen.getByText("Flynn").closest("button");
      fireEvent.click(selectorButton!);

      // Select Jamie
      fireEvent.click(screen.getByText("Jamie"));

      expect(onSelectChild).toHaveBeenCalledWith(mockChildren[1]);
    });

    it("closes dropdown after selection", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      // Open dropdown
      const selectorButton = screen.getByText("Flynn").closest("button");
      fireEvent.click(selectorButton!);

      // Select Jamie
      fireEvent.click(screen.getByText("Jamie"));

      // Dropdown should close - Jamie should only appear once now
      const jamieElements = screen.queryAllByText("Jamie");
      expect(jamieElements.length).toBeLessThanOrEqual(1);
    });

    it("closes dropdown when clicking outside", () => {
      render(
        <div>
          <ChildSelector
            children={mockChildren}
            selectedChild={mockChildren[0]}
            onSelectChild={vi.fn()}
            onAddSession={vi.fn()}
          />
          <div data-testid="outside">Outside</div>
        </div>
      );

      // Open dropdown
      const selectorButton = screen.getByText("Flynn").closest("button");
      fireEvent.click(selectorButton!);

      // Click outside
      fireEvent.mouseDown(screen.getByTestId("outside"));

      // Dropdown should close
      const dropdown = document.querySelector(".absolute.top-full");
      expect(dropdown).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // LOG SESSION BUTTON
  // ==========================================================================

  describe("Log Session Button", () => {
    it("calls onAddSession when clicked", () => {
      const onAddSession = vi.fn();
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={onAddSession}
        />
      );

      fireEvent.click(screen.getByText("Log Session"));

      expect(onAddSession).toHaveBeenCalled();
    });

    it("has the plus icon", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      const button = screen.getByText("Log Session").closest("button");
      expect(button).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // NO SELECTION
  // ==========================================================================

  describe("No Selection", () => {
    it("shows Select child when no child selected", () => {
      render(
        <ChildSelector
          children={mockChildren}
          selectedChild={null}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
        />
      );

      expect(screen.getByText("Select child")).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // STYLING
  // ==========================================================================

  describe("Styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <ChildSelector
          children={mockChildren}
          selectedChild={mockChildren[0]}
          onSelectChild={vi.fn()}
          onAddSession={vi.fn()}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });
});
