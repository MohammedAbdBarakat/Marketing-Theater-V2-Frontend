"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { useProjectStore } from "../../../../store/useProjectStore";
import { useRunStore, type CalendarEntry } from "../../../../store/useRunStore";

import { PhaseStepper } from "../../../../components/run/PhaseStepper";
import { MeetingTheater } from "../../../../components/run/MeetingTheater";
import { SignalsReviewModal } from "../../../../components/run/SignalsReviewModal";
import { StrategyReviewModal } from "../../../../components/run/StrategyReviewModal";
import { SkeletonDayModal } from "../../../../components/run/SkeletonDayModal";
import { CreativeReviewModal } from "../../../../components/run/CreativeReviewModal";
import { ConnectionStatus } from "../../../../components/run/ConnectionStatus";

import {
  confirmSignals,
  confirmStrategy,
  getLatestRunForProject,
  startRun,
} from "../../../../lib/api";
import type { IntelligenceReport } from "../../../../types/intelligence";

function toSkeletonCalendar(skeleton: any[]): Record<string, CalendarEntry[]> {
  const calendar: Record<string, CalendarEntry[]> = {};

  for (const day of skeleton || []) {
    const date = String(day?.date || "1970-01-01").split("T")[0].split(" ")[0];
    const entry: CalendarEntry = {
      id: `skeleton-day-${day?.day_index ?? date}`,
      date,
      channel: day?.platform || "",
      type: String(day?.content_type || "image").toUpperCase(),
      title: day?.topic || "Draft",
      description: day?.goal || "",
      goal: day?.goal || "",
      posting_time: day?.posting_time || "",
      reasoning: day?.reasoning || {},
      owner: "Smart Scheduler",
    };

    if (!calendar[date]) calendar[date] = [];
    calendar[date].push(entry);
  }

  return calendar;
}

function StatusCard({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail?: string;
}) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-500">{title}</div>
      <div className="mt-2 text-sm font-black text-gray-900">{status || "idle"}</div>
      {detail ? <div className="mt-1 text-xs text-gray-500">{detail}</div> : null}
    </div>
  );
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const project = useProjectStore();
  const run = useRunStore();

  const [conn, setConn] = useState<"connecting" | "open" | "closed">("connecting");
  const [selectedSkeletonDay, setSelectedSkeletonDay] = useState<CalendarEntry | null>(null);
  const [creativeReviewData, setCreativeReviewData] = useState<any | null>(null);
  const [phase2Stage, setPhase2Stage] = useState<"2a" | "2b">("2a");

  const duration = useMemo(
    () => ({ start: project.duration.start, end: project.duration.end }),
    [project.duration]
  );

  const skeletonDaysCount = useMemo(() => {
    return Object.values(run.calendar).reduce((acc, entries) => acc + entries.length, 0);
  }, [run.calendar]);

  const isRunComplete =
    run.status === "done" || run.status === "completed";

  const applyRunStatus = (status: string) => {
    run.setStatus(status as any);

    switch (status) {
      case "waiting_for_signals":
        run.setCurrentPhase(1);
        run.setPhaseStatus(1, "waiting_for_signals");
        run.setSignalsModalOpen(!!useRunStore.getState().signalsData);
        setPhase2Stage("2a");
        break;
      case "waiting_for_strategy_approval":
        run.setCurrentPhase(2);
        run.setPhaseStatus(2, "waiting_for_strategy_approval");
        run.setSignalsModalOpen(false);
        setPhase2Stage("2a");
        break;
      case "running":
        run.setSignalsModalOpen(false);
        break;
      case "completed":
      case "done":
        run.setCurrentPhase(3);
        run.setPhaseStatus(3, "done");
        run.setSignalsModalOpen(false);
        break;
      default:
        run.setSignalsModalOpen(false);
        break;
    }
  };

  const hydrateFromLatest = (latest: any) => {
    if (!latest) return;

    if (latest.intelligenceReport) {
      run.setSignalsData(latest.intelligenceReport);
    }

    const latestResults = latest.results || {};

    const skeleton = Array.isArray(latestResults?.skeleton) ? latestResults.skeleton : [];
    if (skeleton.length > 0) {
      run.setCalendar(toSkeletonCalendar(skeleton));
      setPhase2Stage("2b");
    } else if (latest.calendar) {
      run.setCalendar(latest.calendar as any);
    }

    if (latestResults?.creative_calendar) {
      setCreativeReviewData(latestResults.creative_calendar);
    }
  };

  const refreshRunDataFromDB = async (runId: string) => {
    try {
      const latest = await getLatestRunForProject(id);
      if (latest && latest.runId === runId) {
        hydrateFromLatest(latest);
      }
    } catch (e) {
      console.error("Failed to sync run data:", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    let eventSource: { stop: () => void } | null = null;

    async function initRun() {
      run.reset();
      setPhase2Stage("2a");

      try {
        const latest = await getLatestRunForProject(id);
        if (!mounted || !latest) return;

        const activeRunId = latest.runId;
        run.setRunId(activeRunId);

        hydrateFromLatest(latest);

        setConn("connecting");
        try {
          const startRes = await startRun(activeRunId);
          applyRunStatus(startRes.status || "unknown");
          if (
            startRes.status === "waiting_for_strategy_approval" &&
            latest?.results?.master_strategy
          ) {
            run.setStrategyToReview(latest.results.master_strategy);
          }
        } catch (e) {
          console.warn("Start run warning:", e);
          applyRunStatus("running");
        }
        setConn("open");

        const { connectStream } = await import("../../../../lib/sseClient");
        let authoritativeStatus = "unknown";

        eventSource = connectStream(
          activeRunId,
          {
            onEvent: async (ev: any) => {
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
                run.setCurrentPhase(3);
                run.setPhaseStatus(3, "done");
                setCreativeReviewData(ev.calendar); // This will trigger the UI popup!
                return;
              }

              switch (ev.type) {
                case "phase_start":
                  if (ev.phase === 1) {
                    run.setCurrentPhase(1);
                    run.setPhaseStatus(1, "running");
                  } else if (ev.phase === 2) {
                    run.setCurrentPhase(2);
                    run.setPhaseStatus(2, "running");
                    setPhase2Stage((prev) => (prev === "2b" ? prev : "2a"));
                  } else if (ev.phase === 3) {
                    run.setCurrentPhase(3);
                    run.setPhaseStatus(3, "running");
                  }
                  break;
                case "log":
                  run.pushLog({ phase: ev.phase, speaker: ev.speaker, text: ev.text, ts: ev.ts });
                  break;
                case "strategy_locked":
                  setPhase2Stage("2a");
                  run.setCurrentPhase(2);
                  run.setPhaseStatus(2, "waiting_for_strategy_approval");
                  run.setStrategyToReview(ev.data);
                  break;
                case "skeleton_day_progress": {
                  const payload = ev.data || {};
                  setPhase2Stage("2b");
                  run.setCurrentPhase(2);
                  run.setPhaseStatus(2, "running");
                  if (payload.day_index) {
                    run.pushLog({
                      phase: 2,
                      speaker: "SmartScheduler",
                      text: `Planning day ${payload.day_index} (${payload.date || ""})`,
                      ts: Date.now(),
                    });
                  }
                  break;
                }
                case "skeleton_day_planned": {
                  setPhase2Stage("2b");
                  run.setCurrentPhase(2);
                  run.setPhaseStatus(2, "running");

                  const dayData = ev.data?.plan ?? ev.data;
                  const parsedDate = String(dayData?.date || "1970-01-01").split(" ")[0].split("T")[0];

                  const mappedDay: CalendarEntry = {
                    id: `day-${dayData?.day_index ?? parsedDate}`,
                    date: parsedDate,
                    channel: dayData?.platform || "",
                    type: String(dayData?.content_type || "image").toUpperCase(),
                    title: dayData?.topic || "Draft",
                    description: dayData?.goal || "",
                    goal: dayData?.goal,
                    posting_time: dayData?.posting_time,
                    reasoning: dayData?.reasoning,
                    owner: "Smart Scheduler",
                  };

                  run.addCalendarEntries(parsedDate, [mappedDay]);
                  break;
                }
                case "phase_2_complete":
                  run.setPhaseStatus(2, "done");
                  run.setCurrentPhase(3);
                  break;
                case "phase_result":
                  if ([1, 2, 3].includes(ev.phase)) {
                    run.setResult({
                      phase: ev.phase,
                      summary: ev.summary,
                      artifacts: ev.artifacts,
                      candidates: ev.candidates,
                    });
                  }
                  break;
                case "campaign_events":
                  // Deprecated in the run page flow. Ignored intentionally.
                  break;
                case "done":
                  applyRunStatus("completed");
                  setConn("closed");
                  await refreshRunDataFromDB(activeRunId);
                  break;
                case "strategy_candidates":
                  if (authoritativeStatus === "completed" || authoritativeStatus === "running_phase_4") return;
                  break;
                case "calendar_day":
                case "error":
                  break;
              }
            },
            onError: (msg) => {
              console.log("SSE Retry/Error:", msg);
            },
          },
          {
            startDateISO: duration.start,
            endDateISO: duration.end,
            hasConfirmedSignals: () => useRunStore.getState().phases[1] === "done",
            hasConfirmedStrategy: () => !useRunStore.getState().strategyToReview,
            hasConfirmedSkeleton: () => useRunStore.getState().phases[2] === "done",
          }
        );
      } catch {
        if (mounted) {
          setConn("closed");
          run.setStatus("error");
        }
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
    run.setPhaseStatus(1, "done");
    setPhase2Stage("2a");
    applyRunStatus("running");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PhaseStepper phases={run.phases} current={run.currentPhase || 1} phase2Stage={phase2Stage} />
        <ConnectionStatus status={conn} />
      </div>
      <MeetingTheater logs={run.theater} currentPhase={run.currentPhase || 1} isDone={isRunComplete} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard title="Phase 1 · Intelligence" status={run.phases[1]} />
        <StatusCard title="Phase 2a · Strategy Lock" status={phase2Stage === "2a" ? run.phases[2] : "done"} />
        <StatusCard
          title="Phase 2b · Skeleton Distribution"
          status={phase2Stage === "2b" ? run.phases[2] : run.phases[2] === "done" ? "done" : "idle"}
          detail={`${skeletonDaysCount} skeleton day${skeletonDaysCount === 1 ? "" : "s"}`}
        />
        <StatusCard
          title="Phase 3 · Creative Fill"
          status={run.phases[3]}
          detail={creativeReviewData ? "Creative output ready for review" : undefined}
        />
      </div>

      {/* NEW: Phase 2 Stage B - Skeleton Generation Live View */}
      {Object.keys(run.calendar).length > 0 && (
        <div className="border rounded-lg p-6 bg-white shadow-sm mt-4 lg:col-span-3">
          <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-lg font-black tracking-tight">Phase 2b: Skeleton Distribution</h3>
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
                const dayName =
                  dayObj.toLocaleDateString("en-US", { weekday: "short" }) !== "Invalid Date"
                    ? dayObj.toLocaleDateString("en-US", { weekday: "short" })
                    : "Day";

                return (
                  <div
                    key={date}
                    className="border border-gray-200 rounded p-3 flex flex-col gap-2 bg-gray-50 hover:border-black transition-colors relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-1">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayName}</span>
                      <span className="text-lg font-black text-black">{dayNum}</span>
                    </div>
                    <div className="space-y-2">
                      {entries.map((entry, idx) => (
                        <div
                          key={`${entry.id}-${idx}`}
                          onClick={() => setSelectedSkeletonDay(entry)}
                          className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden group hover:border-black transition-colors cursor-pointer active:scale-[0.98]"
                        >
                          <div className="flex justify-between items-start p-2.5 border-b border-gray-100 bg-gray-50/50">
                            <div className="flex flex-col gap-1 w-full relative">
                              <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">
                                Goal: {entry.goal || "Draft"}
                              </span>
                              <span className="text-xs font-bold text-black capitalize pr-6">
                                {entry.channel || "Platform"}
                              </span>
                              <div className="absolute right-0 top-0 text-gray-300 group-hover:text-black transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5">
                            <h4 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2" title={entry.title}>
                              {entry.title || "Draft"}
                            </h4>
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

      <SignalsReviewModal 
        open={run.isSignalsModalOpen} 
        data={run.signalsData} 
        onConfirm={handleConfirmSignals} 
        onClose={() => run.setSignalsModalOpen(false)}
      />

      <StrategyReviewModal
        open={!!run.strategyToReview}
        data={run.strategyToReview}
        onClose={() => run.setStrategyToReview(null)}
        onConfirm={async (editedData) => {
          if (run.runId) {
            await confirmStrategy(run.runId, editedData);
          }
          run.setStrategyToReview(null);
          setPhase2Stage("2b");
          applyRunStatus("running");
        }}
      />

      <SkeletonDayModal open={!!selectedSkeletonDay} entry={selectedSkeletonDay} onClose={() => setSelectedSkeletonDay(null)} />

      <CreativeReviewModal
        isOpen={!!creativeReviewData}
        data={creativeReviewData}
        onClose={() => {
          setCreativeReviewData(null);
          run.setStatus("done");
          setConn("closed");
        }}
      />
    </div>
  );
}
