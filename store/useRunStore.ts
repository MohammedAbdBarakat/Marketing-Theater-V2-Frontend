"use client";
import { create } from "zustand";
import type { IntelligenceReport } from "../types/intelligence";

export type PhaseStatus =
  | "idle"
  | "running"
  | "running_phase_4"
  | "done"
  | "completed"
  | "unknown"
  | "error"
  | "waiting_for_events"
  | "waiting_for_signals"
  | "waiting_for_strategy_approval"
  | "waiting_for_creative";

export type TheaterLog = { phase: number; speaker: string; text: string; ts: number };

export type PhaseResult = {
  phase: 1 | 2 | 3 | 4;
  summary: string;
  artifacts: any[];
  candidates?: { id: string; name: string; rationale: string; highlights: string[] }[];
};

export type CalendarEntry = {
  asset_id: string;
  id: string;
  date: string;
  channel: string;
  type: string;
  title: string;
  owner?: string;
  effort?: "low" | "med" | "high";
  description?: string;
  relatedEvents?: string[];
  goal?: string;
  posting_time?: string;
  reasoning?: {
    goal_reason?: string;
    topic_reason?: string;
    type_reason?: string;
    time_reason?: string;
    signals_used?: string[];
  };
  creative?: {
    hook?: string;
    caption?: string;
    hashtags?: string[];
    cta?: string;
    copywriting_reasoning?: string;
    visual_direction?: {
      mood?: string;
      style_hint?: string;
      visual_reasoning?: string;
    }
  };
};

export type ToolResult = {
  id: string;
  tool_name: string;
  status: "success" | "failed" | "skipped";
  data?: any;
};

export type RunState = {
  runId?: string;
  status: PhaseStatus;
  currentPhase: 1 | 2 | 3 | 4 | 5 | 0;
  phases: Record<1 | 2 | 3 | 4 | 5, PhaseStatus>;
  theater: Record<1 | 2 | 3 | 4 | 5, TheaterLog[]>;
  results: Partial<Record<1 | 2 | 3 | 4, PhaseResult>>;
  selectedStrategyId?: string;
  calendar: Record<string, CalendarEntry[]>; // ISO date -> entries
  toolResults: ToolResult[];
  isSignalsModalOpen: boolean;
  signalsData: IntelligenceReport | null;
  strategyToReview: any | null;

  setRunId: (id: string) => void;
  setStatus: (s: PhaseStatus) => void;
  setPhaseStatus: (p: 1 | 2 | 3 | 4 | 5, s: PhaseStatus) => void;
  setCurrentPhase: (p: RunState["currentPhase"]) => void;
  pushLog: (log: TheaterLog) => void;
  setResult: (result: PhaseResult) => void;
  setSelectedStrategy: (id: string) => void;
  addCalendarEntries: (date: string, entries: CalendarEntry[]) => void;
  setCalendar: (calendar: Record<string, CalendarEntry[]>) => void;
  setTheater: (theater: Record<number, TheaterLog[]>) => void;
  addToolResult: (result: ToolResult) => void;
  reset: () => void;
  setSignalsModalOpen: (isOpen: boolean) => void;
  setSignalsData: (data: IntelligenceReport | null) => void;
  setStrategyToReview: (data: any) => void;
};

export const useRunStore = create<RunState>()((set, get) => ({
  runId: undefined,
  status: "idle",
  currentPhase: 0,
  phases: { 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" },
  theater: { 1: [], 2: [], 3: [], 4: [], 5: [] },
  results: {},
  selectedStrategyId: undefined,
  calendar: {},
  toolResults: [],
  isSignalsModalOpen: false,
  signalsData: null,
  strategyToReview: null,

  setRunId: (id) => set({ runId: id }),
  setStatus: (s) => set({ status: s }),
  setPhaseStatus: (p, s) => set((st) => ({ phases: { ...st.phases, [p]: s } })),
  setCurrentPhase: (p) => set({ currentPhase: p }),
  pushLog: (log) =>
    set((st) => {
      const existing = st.theater[log.phase as 1 | 2 | 3 | 4 | 5] || [];
      // Dedup: check if same log exists (by text & speaker)
      const isDuplicate = existing.some(
        (l) => l.text === log.text && l.speaker === log.speaker && l.phase === log.phase
      );
      if (isDuplicate) return st;

      const max = 50;
      const next = [...existing, log].slice(-max);
      return { theater: { ...st.theater, [log.phase as 1 | 2 | 3 | 4 | 5]: next } };
    }),
  setTheater: (theater) => set({ theater: { ...theater } as any }),
  setResult: (result) =>
    set((st) => ({ results: { ...st.results, [result.phase]: result } })),
  setSelectedStrategy: (id) => set({ selectedStrategyId: id }),
  addCalendarEntries: (date, entries) =>
    set((st) => {
      const existing = st.calendar[date] || [];
      const merged = [...existing];

      for (const entry of entries) {
        const isDuplicate = merged.some((current) => {
          if (current.id && entry.id && current.id === entry.id) return true;
          return (
            current.title === entry.title &&
            current.channel === entry.channel &&
            current.posting_time === entry.posting_time &&
            current.type === entry.type
          );
        });

        if (!isDuplicate) {
          merged.push(entry);
        }
      }

      return { calendar: { ...st.calendar, [date]: merged } };
    }),
  setCalendar: (calendar) => set({ calendar }),
  addToolResult: (result) =>
    set((st) => {
      const exists = st.toolResults.some((r) => r.id === result.id);
      if (exists) return st;
      return { toolResults: [...st.toolResults, result] };
    }),
  setSignalsModalOpen: (isOpen) => set({ isSignalsModalOpen: isOpen }),
  setSignalsData: (data) => set({ signalsData: data }),
  setStrategyToReview: (data) => set({ strategyToReview: data }),
  reset: () =>
    set({
      runId: undefined,
      status: "idle",
      currentPhase: 0,
      phases: { 1: "idle", 2: "idle", 3: "idle", 4: "idle", 5: "idle" },
      theater: { 1: [], 2: [], 3: [], 4: [], 5: [] },
      results: {},
      selectedStrategyId: undefined,
      calendar: {},
      toolResults: [],
      isSignalsModalOpen: false,
      signalsData: null,
      strategyToReview: null,
    }),
}));
