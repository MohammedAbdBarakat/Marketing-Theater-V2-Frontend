"use client";
import { useState, useEffect, useRef } from "react";
import type { TheaterLog } from "../../store/useRunStore";
import ReactMarkdown from "react-markdown";

type ViewMode = "collapsed" | "default" | "expanded";

interface MeetingTheaterProps {
  logs: Record<number, TheaterLog[]>;
  currentPhase: number;
  isDone?: boolean;
  calendar?: Record<string, any[]>;
  onSkeletonClick?: (entry: any) => void;
}

export function MeetingTheater({ logs, currentPhase, isDone, calendar = {}, onSkeletonClick }: MeetingTheaterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("default");
  const [selectedTab, setSelectedTab] = useState<number | null>(null);
  const [reduceMotion, setReduce] = useState(false);
  const normalizedCurrentPhase = currentPhase > 4 ? 4 : currentPhase || 1;
  const activeTab = selectedTab ?? normalizedCurrentPhase;

  // Auto-scroll logic (scoped to the active tab's logs)
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeLogs = logs[activeTab] || [];
  const lastLogIndex = activeLogs.length - 1;

  // Check if we have calendar data to trigger the split screen
  const hasCalendar = Object.keys(calendar).length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: reduceMotion ? "auto" : "smooth"
      });
    }
  }, [activeLogs.length, viewMode, reduceMotion, activeTab]);

  if (viewMode === "collapsed") {
    return (
      <div
        className="mb-4 rounded-lg border p-3 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white cursor-pointer hover:shadow-md transition-all duration-300"
        onClick={() => setViewMode("default")}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">Meeting Theater</span>
          {currentPhase !== 5 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">
              Phase {activeTab} • {activeLogs.length} msgs
            </span>
          )}
        </div>
        <button className="text-xs text-gray-600 font-medium hover:text-black hover:underline transition-colors">Expand</button>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-white shadow-lg flex flex-col transition-all duration-300 overflow-hidden ${viewMode === "expanded" ? "fixed inset-2 sm:inset-4 z-50 shadow-2xl" : "relative mb-4"}`}>

      {/* Header - Now wraps intelligently on mobile */}
      <div className="bg-gray-50 border-b border-gray-100 px-3 sm:px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="text-sm font-bold tracking-wide text-gray-900">Meeting Theater</div>

          {/* Phase Tabs */}
          <div className="flex items-center gap-1 bg-gray-200/50 p-1 rounded-lg overflow-x-auto hide-scrollbar">
            {[1, 2, 3, 4].map((p) => (
              <button
                key={p}
                onClick={() => setSelectedTab(p)}
                className={`text-xs px-2 sm:px-3 py-1 rounded transition-all duration-200 whitespace-nowrap ${activeTab === p
                  ? "bg-white text-black font-bold shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-200/50"
                  }`}
              >
                Phase {p}
              </button>
            ))}
          </div>
        </div>

        {/* Controls - scrollable on very small screens */}
        <div className="flex items-center gap-2 sm:gap-4 text-xs text-gray-500 overflow-x-auto hide-scrollbar pb-1 md:pb-0 w-full md:w-auto justify-start md:justify-end">
          <label className="inline-flex items-center gap-1.5 cursor-pointer hover:text-gray-900 transition-colors select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduce(e.target.checked)}
              className="rounded border-gray-300 text-black focus:ring-black focus:ring-offset-0 bg-white w-3.5 h-3.5"
            />
            Reduce motion
          </label>

          <div className="h-4 w-[1px] bg-gray-300 mx-1 hidden sm:block" />

          <button
            className={`transition-colors hover:text-black whitespace-nowrap ${viewMode === 'default' ? 'text-black font-bold' : ''}`}
            onClick={() => setViewMode("default")}
            disabled={viewMode === "default"}
          >
            Box
          </button>
          <button
            className={`transition-colors hover:text-black whitespace-nowrap ${viewMode === 'expanded' ? 'text-black font-bold' : ''}`}
            onClick={() => setViewMode("expanded")}
            disabled={viewMode === "expanded"}
          >
            Full
          </button>
          <button
            className="text-gray-400 hover:text-red-500 transition-colors ml-1 sm:ml-2 whitespace-nowrap"
            onClick={() => setViewMode("collapsed")}
          >
            Close
          </button>
        </div>
      </div>

      {/* Body Container: Stacks vertically on mobile (h-[700px]), side-by-side on desktop (h-[550px]) */}
      <div className={`flex flex-col lg:flex-row overflow-hidden ${viewMode === 'expanded' ? 'flex-1' : 'h-[700px] lg:h-[550px]'}`}>
        
        {/* Left: Chat Logs (flex-1 on mobile so it shares space) */}
        <div
          ref={scrollRef}
          className={`overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-6 custom-scrollbar bg-white transition-all duration-500 flex-1 lg:flex-none ${hasCalendar ? 'lg:w-[40%] border-b lg:border-b-0 lg:border-r border-gray-100' : 'w-full'}`}
        >
          {activeLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60 min-h-[150px]">
              {!isDone && activeTab === currentPhase ? (
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs">Waiting for messages...</span>
                </div>
              ) : (
                <span className="text-xs italic">No logs for Phase {activeTab} yet.</span>
              )}
            </div>
          ) : (
            activeLogs.map((l, idx) => {
              const isTool = isToolSpeaker(l.speaker);
              const shouldAnimate = idx === lastLogIndex && !reduceMotion && activeTab === currentPhase && !isTool;

              return (
                <div
                  key={idx}
                  className={`text-sm animate-in fade-in slide-in-from-bottom-1 duration-300 ${isTool
                      ? "rounded-2xl border border-sky-100 bg-sky-50/70 p-3 sm:p-4"
                      : "flex items-start gap-2 sm:gap-3 group"
                    }`}
                >
                  {isTool ? (
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 min-w-[2rem] sm:min-w-[2.25rem] rounded-xl bg-sky-600 text-white text-xs font-bold flex-shrink-0 shadow-sm">
                        {avatar(l.speaker)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <div className="font-bold text-sky-950 text-xs uppercase tracking-wide">{l.speaker}</div>
                          <span className="px-2 py-0.5 rounded-full bg-white text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.18em] text-sky-700 border border-sky-200">
                            Tool Status
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-sky-700/70 font-normal">
                            {l.ts ? new Date(l.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <div className="text-sky-950 leading-relaxed prose prose-sm max-w-none prose-p:my-0 text-xs sm:text-sm">
                          <ReactMarkdown>{l.text}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 min-w-[1.75rem] sm:min-w-[2rem] rounded-full bg-black text-white text-[10px] sm:text-xs font-bold flex-shrink-0 shadow-sm ring-2 ring-gray-50 group-hover:ring-gray-200 transition-all">
                        {avatar(l.speaker)}
                      </span>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <div className="font-bold text-gray-900 text-[11px] sm:text-xs uppercase tracking-wide">
                            {l.speaker}
                          </div>
                          <span className="text-[9px] sm:text-[10px] text-gray-400 font-normal">
                            {l.ts ? new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                          </span>
                        </div>
                        <div className="text-gray-800 leading-relaxed prose prose-sm max-w-none prose-p:my-0 prose-ul:my-1 prose-li:my-0 prose-strong:font-bold prose-headings:font-bold prose-headings:text-xs prose-headings:uppercase prose-a:text-blue-600 text-xs sm:text-sm">
                          {shouldAnimate ? (
                            <Typewriter text={l.text} />
                          ) : (
                            <ReactMarkdown>{l.text}</ReactMarkdown>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Live Indicator */}
          {!isDone && activeTab === currentPhase && activeLogs.length > 0 && (
            <div className="sticky bottom-0 left-0 right-0 flex justify-center pb-2 pointer-events-none">
              <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full border shadow-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse delay-75" />
                </div>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-500 tracking-wider">Live</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: Calendar Generation Live View (flex-1 on mobile so it shares space) */}
        {hasCalendar && (
          <div className="flex-1 lg:flex-none lg:w-[60%] bg-gray-50 flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-500">
            <div className="flex justify-between items-center px-4 sm:px-5 py-2 sm:py-3 border-b border-gray-200 bg-gray-100 flex-shrink-0">
              <h3 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-500">Phase 2: Skeleton Assembly</h3>
              <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 bg-black text-white rounded whitespace-nowrap">
                {Object.keys(calendar).length} Days Planned
              </span>
            </div>
            
            <div className="overflow-y-auto p-3 sm:p-5 custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {Object.entries(calendar)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, entries]) => {
                    const dayObj = new Date(date);
                    const dayNum = dayObj.getDate() || date.split("-")[2];
                    const dayName = dayObj.toLocaleDateString("en-US", { weekday: "short" }) !== "Invalid Date" ? dayObj.toLocaleDateString("en-US", { weekday: "short" }) : "Day";

                    return (
                      <div key={date} className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2 bg-white shadow-sm hover:border-black transition-colors">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-1">
                          <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{dayName}</span>
                          <span className="text-sm font-black text-black">{dayNum}</span>
                        </div>
                        <div className="space-y-2">
                          {entries.map((entry, idx) => (
                            <div
                              key={idx}
                              onClick={() => onSkeletonClick?.(entry)}
                              className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden group hover:border-black hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
                            >
                              <div className="flex justify-between items-start p-2 border-b border-gray-100 bg-white">
                                <div className="flex flex-col gap-0.5 w-full relative">
                                  <span className="text-[8px] sm:text-[9px] font-black uppercase text-gray-400 tracking-wider line-clamp-1">Goal: {entry.goal || "Draft"}</span>
                                  <span className="text-[11px] sm:text-xs font-bold text-black capitalize pr-4">{entry.channel || "Platform"}</span>
                                  <div className="absolute right-0 top-0 text-gray-300 group-hover:text-black transition-colors">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                                  </div>
                                </div>
                              </div>
                              <div className="p-2">
                                <h4 className="font-bold text-[11px] sm:text-xs text-gray-900 leading-snug line-clamp-2" title={entry.title}>{entry.title || "Draft"}</h4>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Typewriter({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const targetTextRef = useRef(text);
  const currentDisplayRef = useRef("");

  useEffect(() => {
    targetTextRef.current = text;
  }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      const target = targetTextRef.current;
      const current = currentDisplayRef.current;
      if (current === target) return;
      if (!target.startsWith(current)) {
        currentDisplayRef.current = "";
        setDisplayedText("");
        return;
      }
      const nextString = current + target.charAt(current.length);
      currentDisplayRef.current = nextString;
      setDisplayedText(nextString);
    }, 8);

    return () => clearInterval(interval);
  }, []);

  return <ReactMarkdown>{displayedText}</ReactMarkdown>;
}

function isToolSpeaker(name: string) {
  return [
    "Perplexity",
    "Reddit",
    "Calendarific",
    "Gemini",
    "Tool",
  ].some((label) => name.includes(label));
}

function avatar(name: string) {
  if (name.includes("CEO")) return "C";
  if (name.includes("Creative")) return "D";
  if (name.includes("Media")) return "M";
  if (name.includes("Copy")) return "W";
  if (name.includes("Art")) return "A";
  if (name.includes("Social")) return "S";
  if (name.includes("Perplexity")) return "P";
  if (name.includes("Reddit")) return "R";
  if (name.includes("Calendarific")) return "C";
  if (name.includes("Gemini")) return "G";
  return name[0] || "?";
}