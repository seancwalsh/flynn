/**
 * ChildSelector Component
 * FLY-140: Dashboard UI Layout & Container
 *
 * Header with child selector and quick-add button
 */

import * as React from "react";
import { ChevronDown, Plus, User } from "lucide-react";
import { cn } from "~/lib/utils";
import type { DashboardChild } from "./types";

interface ChildSelectorProps {
  children: DashboardChild[];
  selectedChild: DashboardChild | null;
  onSelectChild: (child: DashboardChild) => void;
  onAddSession: () => void;
  className?: string;
}

export function ChildSelector({
  children,
  selectedChild,
  onSelectChild,
  onAddSession,
  className,
}: ChildSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("flex items-center justify-between", className)}>
      {/* Child Selector */}
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {selectedChild?.avatarUrl ? (
              <img
                src={selectedChild.avatarUrl}
                alt={selectedChild.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-5 h-5 text-primary-600" />
            )}
          </div>

          {/* Name */}
          <div className="text-left">
            <p className="font-semibold text-gray-900">
              {selectedChild?.name || "Select child"}
            </p>
            {selectedChild?.age && (
              <p className="text-xs text-gray-500">
                {selectedChild.age} years old
              </p>
            )}
          </div>

          {/* Dropdown arrow */}
          {children.length > 1 && (
            <ChevronDown
              className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && children.length > 1 && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => {
                  onSelectChild(child);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors",
                  selectedChild?.id === child.id && "bg-primary-50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
                  {child.avatarUrl ? (
                    <img
                      src={child.avatarUrl}
                      alt={child.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-primary-600" />
                  )}
                </div>
                <span className="font-medium text-gray-900">{child.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Add Button */}
      <button
        onClick={onAddSession}
        className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
      >
        <Plus className="w-4 h-4" />
        <span className="font-medium">Log Session</span>
      </button>
    </div>
  );
}
