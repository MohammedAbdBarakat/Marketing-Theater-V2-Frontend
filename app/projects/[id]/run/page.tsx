"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import dayjs from "dayjs";
import { useProjectStore } from "../../../../store/useProjectStore";
import { useRunStore, type CalendarEntry } from "../../../../store/useRunStore";

import { PhaseStepper } from "../../../../components/run/PhaseStepper";
import { MeetingTheater } from "../../../../components/run/MeetingTheater";
import { PhaseResultCard } from "../../../../components/run/PhaseResultCard";
import { EventsSelectionModal } from "../../../../components/run/EventsSelectionModal";
import { SignalsReviewModal } from "../../../../components/run/SignalsReviewModal";
import { StrategyReviewModal } from "../../../../components/run/StrategyReviewModal";
import { SkeletonDayModal } from "../../../../components/run/SkeletonDayModal";
import { CreativeReviewModal } from "../../../../components/run/CreativeReviewModal";
import { confirmSignals, confirmStrategy } from "../../../../lib/api";
import { selectStrategy, getLatestRunForProject, resetPhase4, downloadReport, confirmEventSelection } from "../../../../lib/api";
import type { CampaignDay } from "../../../../types/events";
import type { IntelligenceReport } from "../../../../types/intelligence";
import { ConnectionStatus } from "../../../../components/run/ConnectionStatus";
import Link from "next/link";

export default function RunPage() {
  const { id } = useParams<{ id: string }>(); // Project ID
  const project = useProjectStore();
  const run = useRunStore();
  const [conn, setConn] = useState<"connecting" | "open" | "closed">("connecting");
  const [eventsPrompt, setEventsPrompt] = useState<CampaignDay[] | null>(null);
  const [selectedSkeletonDay, setSelectedSkeletonDay] = useState<CalendarEntry | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [creativeReviewData, setCreativeReviewData] = useState<any | null>(null);

  const duration = useMemo(() => ({ start: project.duration.start, end: project.duration.end }), [project.duration]);
  const isRunComplete = run.status === "done" || run.status === "completed";

  const applyRunStatus = (status: string) => {
    run.setStatus(status as any);

    switch (status) {
      case "waiting_for_signals":
        run.setCurrentPhase(1);
        run.setPhaseStatus(1, "waiting_for_signals");
        run.setSignalsModalOpen(!!useRunStore.getState().signalsData);
        break;
      case "waiting_for_strategy_approval":
        run.setCurrentPhase(2);
        run.setPhaseStatus(2, "waiting_for_strategy_approval");
        run.setSignalsModalOpen(false);
        break;
      case "waiting_for_creative":
        run.setCurrentPhase(3);
        run.setPhaseStatus(3, "waiting_for_creative");
        run.setSignalsModalOpen(false);
        break;
      case "waiting_for_events":
        run.setCurrentPhase(4);
        run.setPhaseStatus(4, "waiting_for_events");
        run.setSignalsModalOpen(false);
        break;
      case "running_phase_4":
        run.setCurrentPhase(4);
        run.setPhaseStatus(4, "running");
        run.setSignalsModalOpen(false);
        break;
      case "completed":
      case "done":
        run.setCurrentPhase(5);
        run.setPhaseStatus(4, "done");
        run.setSignalsModalOpen(false);
        setEventsPrompt(null);
        break;
      default:
        run.setSignalsModalOpen(false);
        break;
    }
  };


  const refreshRunDataFromDB = async (runId: string) => {
    try {
      console.log("🔄 Syncing with Database to get Real UUIDs...");
      const latest = await getLatestRunForProject(id);

      if (latest && latest.runId === runId) {
        // 1. تحديث الرزنامة بالبيانات التي تحتوي على Real IDs
        if (latest.calendar) {
          // Normalize keys (e.g. "2026-01-21 00:00:00" -> "2026-01-21")
          const normalize = (cal: Record<string, any[]>) => {
            const norm: Record<string, any[]> = {};
            for (const [key, list] of Object.entries(cal)) {
              const d = key.split(" ")[0].split("T")[0];
              if (dayjs(d).isValid()) {
                norm[d] = [...(norm[d] || []), ...list];
              }
            }
            return norm;
          };
          run.setCalendar(normalize(latest.calendar as any));
          console.log("✅ Calendar synced with DB (Real IDs loaded).");
        }

        // 2. تحديث نتائج المراحل لضمان تطابق الحالة
        if (latest.results) {
          Object.entries(latest.results).forEach(([phaseStr, data]: [string, any]) => {
            const p = parseInt(phaseStr) as 1 | 2 | 3 | 4;
            if ([1, 2, 3, 4].includes(p)) {
              run.setResult({
                phase: p,
                summary: data.summary,
                artifacts: data.artifacts,
                candidates: data.candidates
              });
              run.setPhaseStatus(p, "done");
            }
          });
        }
      }
    } catch (e) {
      console.error("❌ Failed to sync run data:", e);
    }
  };

  async function handleRegenerate() {
    if (!run.runId) return;
    const confirmed = window.confirm("Are you sure you want to delete the current Calendar and regenerate it? This cannot be undone.");
    if (!confirmed) return;

    setIsResetting(true);
    try {
      // A. Call the DELETE endpoint
      await resetPhase4(run.runId);

      // B. Reload the page to restart the SSE Stream
      // The backend will see Phase 4 is missing and start generating it again.
      window.location.reload();
    } catch (err) {
      alert("Failed to reset run. Check console.");
      console.error(err);
      setIsResetting(false);
    }
  }

  async function handleDownloadReport() {
    if (!run.runId) return;
    setIsGeneratingReport(true);
    try {
      const { url } = await downloadReport(run.runId);
      window.open(url, "_blank");
    } catch {
      alert("Report generation failed. Please try again.");
    } finally {
      setIsGeneratingReport(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    let eventSource: any = null;

    async function initRun() {
      // 0. Reset Store to prevent state bleed from previous projects
      // We do this inside initRun to ensure it happens as part of the loading sequence for this ID.
      // Note: This clears runId, so we rely on fetching 'latest' or starting fresh.
      run.reset();

      try {
        let activeRunId: string | undefined = undefined; // Was run.runId, but we just reset it. 
        // If we wanted to preserve state on same-project nav, we'd need to check if run.projectId === id. 
        // But store doesn't have projectId. Safe approach: Always reset and refetch/hydrate.

        // 1. Initial Fetch (Get ID + Hydrate State)
        if (!activeRunId) {
          const latest = await getLatestRunForProject(id);
          if (latest && mounted) {
            activeRunId = latest.runId;
            run.setRunId(latest.runId);
            if (latest.selectedStrategyId) run.setSelectedStrategy(latest.selectedStrategyId);

            // Hydrate immediately so user sees data while connecting
            if (latest.calendar) run.setCalendar(latest.calendar as any);
            if (latest.results) {
              Object.entries(latest.results).forEach(([phaseStr, data]: [string, any]) => {
                const p = parseInt(phaseStr) as 1 | 2 | 3 | 4;
                if ([1, 2, 3, 4].includes(p)) {
                  run.setResult({ phase: p, summary: data.summary, artifacts: data.artifacts, candidates: data.candidates });
                  run.setPhaseStatus(p, "done");
                }
              });
            }

            // Hydrate Theater from chat_history if available
            // @ts-ignore
            if ((latest as any).chat_history) {
              const newTheater: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
              // @ts-ignore
              Object.entries((latest as any).chat_history).forEach(([phaseStr, messages]: [string, any[]]) => {
                const p = parseInt(phaseStr);
                if (!isNaN(p)) {
                  newTheater[p] = messages.map((m: any, idx: number) => ({
                    phase: p,
                    speaker: m.name || m.role,
                    text: m.content,
                    ts: Date.now() + idx // Mock TS to maintain order if missing
                  }));
                }
              });
              run.setTheater(newTheater);
            }

            if (latest.intelligenceReport) {
              run.setSignalsData(latest.intelligenceReport);
            }
          }
        }

        if (!activeRunId && mounted) {
          // Create new run if none exists (or could be error state)
          // For now, assume a run is created via "Start" on project page or similar.
          // If we are here, we might need to create one, OR start a new one.
          // Requirement says: "Call this immediately when the user creates a new run or clicks Retry/Generate"
          // If we are just landing here, we assume a run exists or we start one.
          // Let's assume we try to get latest, if not, we start a new run?
          // Actually, the new backend flow says: POST /runs/{id}/start
          // If we don't have an ID, we can't start.
          // So we probably need to create a run first if it doesn't exist?
          // The previous code `activeRunId = "local"` suggests we mock it.
          // Let's stick to valid ID.
          return;
        }

        if (!mounted || !activeRunId) return;

        // 2. EXPLICIT START (Idempotent)
        // We only call start if we are "starting" the run. 
        // If we are just refreshing, we skip start?
        // User guideline: "Also connect to this on page load (if the user refreshes), so they rejoin the session."
        // "If the user refreshes the page: Do NOT call /start."
        // How do we know if it's a refresh vs new?
        // Maybe we just don't call start here? Start should be called by the action that triggers the run.
        // BUT the prompt says: "Frontend Logic: Call this immediately when the user creates a new run or clicks Retry/Generate."
        // If we are deep linking, we just connect?
        // Let's try to ONLY connect here. The "Create Run" button elsewhere should have called start?
        // OR: we check if the run is "new" status?
        // Actually, the prompt example `startAndWatchRun` implies we call start then watch.
        // For now, let's implement the CONNECT part here. The "Start" might need to happen elsewhere or we check status.
        // Wait, current page load MIGHT be the "Start" action if redirected from creation?
        // Let's call start anyway? 
        // Prompt says: "If it returns 200 with status: 'running', that's fine too (idempotent)."
        // So we CAN call it safely? 
        // "If the user refreshes the page: Do NOT call /start."
        // This is conflicting. Idempotent means safe to call, but "Do NOT call" implies maybe side effects or just unnecessary.
        // Let's assume we can call it if we are unsure, OR safely skip if we know it's running.
        // The implementation plan says: "On Mount: Check if run is already started... Call api.startRun(runId) if this is a fresh start/retry."
        // Let's be safe and call it ONLY if we don't have results yet?
        // Or better: let's make a explicit "Start" button if inactive?
        // No, the user wants auto-start.
        // Let's call startRun safely. If it's running, it's fine.

        // Wait, for REFRESH, we don't want to restart Phase 1 if we are in Phase 3.
        // The backend `start` might reset?
        // "If it returns 200 with status: 'running', that's fine too" -> implies it WON'T reset.
        // So it IS safe.
        // We will call startRun here to be sure, unless we want to rely on the previous page action.
        // Actually, `activeRunId` comes from URL or DB.

        setConn("connecting");

        // Only call start if we suspect it's not running? 
        // Let's Try calling startRun. If it fails or says running, we continue.
        try {
          const { startRun } = await import("../../../../lib/api"); // dynamic import to avoid circ dep if any
          const startRes = await startRun(activeRunId);
          applyRunStatus(startRes.status || "unknown");
        } catch (e) {
          console.warn("Start run warning:", e);
          applyRunStatus("running");
        }
        setConn("open");

        // 3. LISTEN (Pure Listener)
        const { connectStream } = await import("../../../../lib/sseClient");

        // Track authoritative status to prevent stale events
        let authoritativeStatus = "unknown";

        eventSource = connectStream(
          activeRunId,
          {
            onEvent: async (ev: any) => {
              // 1. Handle Status Update (Priority Override)
              if (ev.type === "status_update") {
                authoritativeStatus = ev.status;
                applyRunStatus(ev.status);
                return;
              }
              if (ev.type === "phase_1_signals_ready") {
                run.setCurrentPhase(1);
                run.setPhaseStatus(1, "waiting_for_signals");
                run.setSignalsData(ev.data);
                run.setSignalsModalOpen(true);
                return;
              }

              if (ev.type === "phase_3_creative_ready") {
                console.log("Creative Assembly Complete:", ev.calendar);
                run.setPhaseStatus(3, "done");
                setCreativeReviewData(ev.calendar); // This will trigger the UI popup!
                return;
              }


              switch (ev.type) {
                case "phase_start":
                  run.setCurrentPhase(ev.phase as 1 | 2 | 3 | 4);
                  run.setPhaseStatus(ev.phase as 1 | 2 | 3 | 4, "running");
                  break;
                case "log":
                  run.pushLog({ phase: ev.phase, speaker: ev.speaker, text: ev.text, ts: ev.ts });
                  break;
                case "strategy_locked":
                  run.setStrategyToReview(ev.data);
                  break;
                case "skeleton_day_planned":
                  run.setPhaseStatus(4, "running");
                  run.setCurrentPhase(4);
                  const parsedDate = ev.data.date?.split(" ")[0].split("T")[0] || "1970-01-01";
                  const mappedDay: CalendarEntry = {
                    id: `day-${ev.data.day_index}-${Date.now()}`,
                    date: parsedDate,
                    channel: ev.data.platform,
                    type: ev.data.content_type,
                    title: ev.data.topic || "Draft",
                    description: ev.data.goal,
                    goal: ev.data.goal,
                    posting_time: ev.data.posting_time,
                    reasoning: ev.data.reasoning,
                    owner: "AI Agent",
                  };
                  run.addCalendarEntries(parsedDate, [mappedDay]);
                  break;
                case "phase_2_complete":
                  run.setPhaseStatus(2, "done");
                  run.setCurrentPhase(3);
                  break;
                case "phase_result":
                  run.setResult({ phase: ev.phase, summary: ev.summary, artifacts: ev.artifacts, candidates: ev.candidates });
                  run.setPhaseStatus(ev.phase as 1 | 2 | 3 | 4, "done");
                  if (ev.phase < 3) run.setCurrentPhase((ev.phase + 1) as any);
                  break;
                case "strategy_candidates":
                  // Legacy event. Ignored in upgraded flow (war-room emits `strategy_locked`).
                  if (authoritativeStatus === "completed" || authoritativeStatus === "running_phase_4") return;
                  break;
                case "calendar_day":
                  run.setPhaseStatus(4, "running");
                  run.setCurrentPhase(4);
                  // Normalize date key to ensure real-time updates match UI expectations (YYYY-MM-DD)
                  const normalizedDate = ev.date.split(" ")[0].split("T")[0];
                  if (dayjs(normalizedDate).isValid()) {
                    run.addCalendarEntries(normalizedDate, ev.entries);
                  } else {
                    // Fallback to original if valid check fails, though likely won't happen
                    run.addCalendarEntries(ev.date, ev.entries);
                  }
                  break;

                case "campaign_events":
                  // Auto-skip if no events, otherwise show modal
                  // CHECK: If Phase 4 is already marked done or we have calendar entries, ignore this to prevent re-opening on reload
                  const currentStore = useRunStore.getState();
                  const hasCalendarData = Object.keys(currentStore.calendar).length > 0;
                  const isPhase4Done = currentStore.phases[4] === "done";

                  console.log("DEBUG: campaign_events received", {
                    days: ev.days,
                    hasCalendarData,
                    isPhase4Done,
                    calendarKeys: Object.keys(currentStore.calendar)
                  });

                  // RELAXED CHECK: Only block if we are strictly done. But even then, if backend sends it, maybe we should show it?
                  // For now, logging and ALLOWING it to show helps unblock the user.
                  if (hasCalendarData || isPhase4Done) {
                    console.warn("⚠️ Received campaign_events despite having data. Processing anyway to ensure Modal shows.");
                    // return; // <--- Commented out to fix "Modal not showing" issue
                  }

                  setEventsPrompt(ev.days || []);
                  break;

                case "done":
                  applyRunStatus("completed");
                  setConn("closed");
                  await refreshRunDataFromDB(activeRunId!);
                  break;

                case "error":
                  break;
              }
            },
            onError: (msg) => {
              console.log("SSE Retry/Error:", msg);
            }
          },
          // 4. MOCK MODE PARAMS (Only used if IS_REMOTE is false in config)
          {
            startDateISO: duration.start,
            endDateISO: duration.end,
            hasConfirmedSignals: () => useRunStore.getState().phases[1] === "done", // Wait until phase 1 is marked done (which happens when they confirm)
            hasConfirmedStrategy: () => useRunStore.getState().phases[2] === "done", // Wait until Phase 2 Stage A is marked done
            hasConfirmedSkeleton: () => useRunStore.getState().phases[4] === "done", // <-- Added this
          }
        );

      } catch {
        if (mounted) { setConn("closed"); run.setStatus("error"); }
      }
    }

    initRun();

    return () => {
      mounted = false;
      if (eventSource) eventSource.stop();
      setConn("closed");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirmSignals(approvedReport: IntelligenceReport) {
    if (run.runId) {
      await confirmSignals(run.runId, { intelligence_report: approvedReport });
    }
    run.setSignalsData(approvedReport);
    run.setSignalsModalOpen(false);
    applyRunStatus("running");
    run.setPhaseStatus(1, "done"); // Unblocks mock flow
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PhaseStepper phases={run.phases} current={run.currentPhase || 1} />
        <ConnectionStatus status={conn} />
      </div>
      <MeetingTheater logs={run.theater} currentPhase={run.currentPhase || 1} isDone={run.status === "done"} />
   
      {/* NEW: Phase 2 Stage B - Skeleton Generation Live View */}
      {Object.keys(run.calendar).length > 0 && (
        <div className="border rounded-lg p-6 bg-white shadow-sm mt-4 lg:col-span-3">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-lg font-black tracking-tight">Phase 2: Skeleton Generation</h3>
            <span className="text-xs font-bold px-3 py-1 bg-black text-white rounded-full">
              {Object.keys(run.calendar).length} Days Planned
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(run.calendar)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, entries]) => {
                const dayObj = new Date(date);
                const dayNum = dayObj.getDate() || date.split("-")[2];
                const dayName = dayObj.toLocaleDateString("en-US", { weekday: "short" }) !== "Invalid Date" ? dayObj.toLocaleDateString("en-US", { weekday: "short" }) : "Day";
                
                return (
                  <div key={date} className="border border-gray-200 rounded p-3 flex flex-col gap-2 bg-gray-50 hover:border-black transition-colors relative overflow-hidden group">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayName}</span>
                      <span className="text-lg font-black text-black">{dayNum}</span>
                    </div>
                    <div className="space-y-2">
                        {entries.map((entry, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedSkeletonDay(entry)}
                            className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden group hover:border-black transition-colors cursor-pointer active:scale-[0.98]"
                          >
                             {/* Content Header Grid */}
                             <div className="flex justify-between items-start p-2.5 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex flex-col gap-1 w-full relative">
                                    <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Goal: {entry.goal || "Draft"}</span>
                                    <span className="text-xs font-bold text-black capitalize pr-6">{entry.channel || "Platform"}</span>
                                    
                                    {/* Expand Icon */}
                                    <div className="absolute right-0 top-0 text-gray-300 group-hover:text-black transition-colors">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                                    </div>
                                </div>
                             </div>

                             {/* Content Topic */}
                             <div className="p-2.5">
                                 <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2" title={entry.title}>{entry.title || "Draft"}</h4>
                             </div>
                          </div>
                        ))}
                        {entries.length === 0 && (
                            <div className="text-xs text-gray-400 italic text-center py-2">No content</div>
                        )}
                    </div>
                  </div>
                );
            })}
          </div>
        </div>
      )}

      {run.status === "waiting_for_events" && !!eventsPrompt && (
        <EventsSelectionModal
          isOpen={!!eventsPrompt}
          days={eventsPrompt}
          onConfirm={async (selected) => {
            if (run.runId) await confirmEventSelection(run.runId, selected);
            setEventsPrompt(null);
            applyRunStatus("running_phase_4");
          }}
          onClose={() => setEventsPrompt(null)}
        />
      )}

      <SignalsReviewModal 
        open={run.isSignalsModalOpen} 
        data={run.signalsData} 
        onConfirm={handleConfirmSignals} 
      />

      <StrategyReviewModal 
        open={!!run.strategyToReview} 
        data={run.strategyToReview} 
        onConfirm={async (editedData) => {
          if (run.runId) {
            await confirmStrategy(run.runId, editedData);
            const selectedId =
              typeof editedData?.strategy_title === "string" && editedData.strategy_title.trim()
                ? editedData.strategy_title.trim()
                : "Master Strategy";
            await selectStrategy(run.runId, selectedId);
            run.setSelectedStrategy(selectedId);
          }
          run.setStrategyToReview(null);
          run.setPhaseStatus(2, "done");
          applyRunStatus("waiting_for_events");
        }} 
      />

      <SkeletonDayModal 
        open={!!selectedSkeletonDay} 
        entry={selectedSkeletonDay} 
        onClose={() => setSelectedSkeletonDay(null)} 
      />

      <CreativeReviewModal 
        isOpen={!!creativeReviewData}
        data={creativeReviewData}
        onClose={() => {
          setCreativeReviewData(null);
          run.setStatus("done");
          setConn("closed");
        }}
      />

      {isRunComplete && (
        <div className="flex items-center justify-between mt-8 border-t pt-4">
          <div className="text-gray-600 text-sm">
            Result: Calendar generated.
          </div>

          <div className="flex gap-3 items-center">
            <button
              onClick={handleRegenerate}
              disabled={isResetting}
              className="text-xs px-3 py-2 text-gray-500 hover:text-gray-800 disabled:opacity-50"
            >
              {isResetting ? "Resetting..." : "Regenerate Plan"}
            </button>

            <button
              onClick={handleDownloadReport}
              disabled={isGeneratingReport}
              className="text-sm px-4 py-2 rounded border border-gray-300 text-gray-800 hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
            >
              {isGeneratingReport ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                "Download Report"
              )}
            </button>

            <Link
              href={`/projects/${id}/calendar`}
              className="text-sm px-4 py-2 rounded bg-black text-white hover:bg-gray-800"
            >
              Go to Calendar →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
