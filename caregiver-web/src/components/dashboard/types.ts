/**
 * Dashboard Types
 * FLY-139: Caregiver Dashboard - Smart Overview
 */

export interface TodayStats {
  sessionsLogged: number;
  wordsUsed: number;
  communicationAttempts: number;
  observation?: string; // LLM-generated micro-insight
}

export interface DashboardChild {
  id: string;
  name: string;
  avatarUrl?: string;
  age?: number;
}

export type DashboardMode = "dashboard" | "chat" | "hybrid";
