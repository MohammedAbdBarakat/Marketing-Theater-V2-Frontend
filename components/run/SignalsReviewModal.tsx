"use client";
import { useMemo, useState, type ReactNode } from "react";
import type { IntelligenceReport, IntelligenceItem, IntelligenceSignal } from "../../types/intelligence";

type GlobalSectionKey =
  | "competitor_landscape"
  | "trending_topics"
  | "audience_sentiment"
  | "industry_news";

interface SignalsReviewModalProps {
  open: boolean;
  data: IntelligenceReport | null;
  onConfirm: (approvedReport: IntelligenceReport) => void;
}

const GLOBAL_SECTION_META: Array<{ key: GlobalSectionKey; label: string }> = [
  { key: "trending_topics", label: "Trending Topics" },
  { key: "audience_sentiment", label: "Audience Sentiment" },
  { key: "competitor_landscape", label: "Competitor Landscape" },
  { key: "industry_news", label: "Industry News" },
];

const EMPTY_REPORT: IntelligenceReport = {
  global_intelligence: {
    competitor_landscape: [],
    trending_topics: [],
    audience_sentiment: [],
    industry_news: [],
    strategic_opportunities: [],
  },
  day_capsules: [],
};

export function SignalsReviewModal({ open, data, onConfirm }: SignalsReviewModalProps) {
  const report = useMemo(() => normalizeReport(data), [data]);

  const allSelectableIds = useMemo(() => {
    if (!report) return [];

    const ids: string[] = [];

    for (const { key } of GLOBAL_SECTION_META) {
      report.global_intelligence[key].forEach((_, index) => {
        ids.push(`global:${key}:${index}`);
      });
    }

    report.global_intelligence.strategic_opportunities.forEach((_, index) => {
      ids.push(`opportunity:${index}`);
    });

    report.day_capsules.forEach((capsule) => {
      capsule.signals.forEach((_, signalIndex) => {
        ids.push(`day:${capsule.day_index}:${signalIndex}`);
      });
    });

    return ids;
  }, [report]);

  const selectionKey = allSelectableIds.join("|");
  const [selectionState, setSelectionState] = useState<{ key: string; ids: Set<string> }>({
    key: "",
    ids: new Set(),
  });

  if (!open || !report) return null;

  const selectedIds =
    selectionState.key === selectionKey
      ? selectionState.ids
      : new Set(allSelectableIds);

  const totalSelected = selectedIds.size;
  const hasSelections = totalSelected > 0;

  const updateSelection = (updater: (current: Set<string>) => Set<string>) => {
    setSelectionState((current) => {
      const base = current.key === selectionKey ? current.ids : new Set(allSelectableIds);
      return {
        key: selectionKey,
        ids: updater(new Set(base)),
      };
    });
  };

  const toggle = (id: string) => {
    updateSelection((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectionState({
      key: selectionKey,
      ids: new Set(allSelectableIds),
    });
  };

  const clearAll = () => {
    setSelectionState({
      key: selectionKey,
      ids: new Set(),
    });
  };

  const handleApprove = () => {
    const approvedReport: IntelligenceReport = {
      global_intelligence: {
        competitor_landscape: report.global_intelligence.competitor_landscape.filter((_, index) =>
          selectedIds.has(`global:competitor_landscape:${index}`)
        ),
        trending_topics: report.global_intelligence.trending_topics.filter((_, index) =>
          selectedIds.has(`global:trending_topics:${index}`)
        ),
        audience_sentiment: report.global_intelligence.audience_sentiment.filter((_, index) =>
          selectedIds.has(`global:audience_sentiment:${index}`)
        ),
        industry_news: report.global_intelligence.industry_news.filter((_, index) =>
          selectedIds.has(`global:industry_news:${index}`)
        ),
        strategic_opportunities: report.global_intelligence.strategic_opportunities.filter((_, index) =>
          selectedIds.has(`opportunity:${index}`)
        ),
      },
      day_capsules: report.day_capsules
        .map((capsule) => ({
          ...capsule,
          signals: capsule.signals.filter((_, signalIndex) =>
            selectedIds.has(`day:${capsule.day_index}:${signalIndex}`)
          ),
        }))
        .filter((capsule) => capsule.signals.length > 0),
    };

    onConfirm(approvedReport);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em]">
              Phase 1
            </div>
            <h2 className="text-2xl font-black text-gray-900 mt-3">Intelligence Review</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              Keep the market signals that should guide the next strategy phase. Everything is pre-selected so you can trim noise quickly.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start">
            <div className="text-right">
              <div className="text-2xl font-black text-gray-900">{totalSelected}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold">Items Selected</div>
            </div>
            <button
              type="button"
              onClick={selectAll}
              className="text-xs px-3 py-2 rounded-lg border border-gray-300 hover:border-black hover:text-black transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs px-3 py-2 rounded-lg border border-gray-300 text-gray-500 hover:border-black hover:text-black transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar space-y-8">
          {report.global_intelligence.strategic_opportunities.length > 0 && (
            <section>
              <SectionHeader
                title="Strategic Opportunities"
                subtitle="High-level takeaways the next phase can build on."
              />
              <div className="grid gap-3">
                {report.global_intelligence.strategic_opportunities.map((item, index) => {
                  const id = `opportunity:${index}`;
                  const checked = selectedIds.has(id);
                  return (
                    <SelectableCard key={id} checked={checked} onClick={() => toggle(id)}>
                      <div className="text-sm text-gray-800 leading-relaxed">{item}</div>
                    </SelectableCard>
                  );
                })}
              </div>
            </section>
          )}

          {GLOBAL_SECTION_META.map(({ key, label }) => {
            const items = report.global_intelligence[key];
            if (items.length === 0) return null;

            return (
              <section key={key}>
                <SectionHeader title={label} subtitle={`${items.length} signals`} />
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((item, index) => {
                    const id = `global:${key}:${index}`;
                    const checked = selectedIds.has(id);
                    return (
                      <SelectableCard key={id} checked={checked} onClick={() => toggle(id)}>
                        <IntelligenceItemView item={item} />
                      </SelectableCard>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {report.day_capsules.length > 0 && (
            <section>
              <SectionHeader title="Day Capsules" subtitle="Date-specific signals and angles the planner can use later." />
              <div className="grid gap-4">
                {report.day_capsules.map((capsule) => (
                  <div key={`${capsule.day_index}-${capsule.date}`} className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 mb-4">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">Day {capsule.day_index}</div>
                        <div className="text-lg font-bold text-gray-900">{capsule.date}</div>
                      </div>
                      <div className="text-xs text-gray-500">{capsule.signals.length} signals</div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                      {capsule.signals.map((signal, signalIndex) => {
                        const id = `day:${capsule.day_index}:${signalIndex}`;
                        const checked = selectedIds.has(id);
                        return (
                          <SelectableCard key={id} checked={checked} onClick={() => toggle(id)}>
                            <SignalView signal={signal} />
                          </SelectableCard>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-4 border-t bg-white flex items-center justify-between gap-4">
          <div className="text-xs text-gray-500">
            {hasSelections ? "The next phase will use only the selected intelligence." : "Select at least one item to continue."}
          </div>
          <button
            type="button"
            onClick={handleApprove}
            disabled={!hasSelections}
            className="bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors"
          >
            Approve & Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeReport(data: IntelligenceReport | null): IntelligenceReport | null {
  if (!data) return null;

  return {
    global_intelligence: {
      competitor_landscape: data.global_intelligence?.competitor_landscape ?? EMPTY_REPORT.global_intelligence.competitor_landscape,
      trending_topics: data.global_intelligence?.trending_topics ?? EMPTY_REPORT.global_intelligence.trending_topics,
      audience_sentiment: data.global_intelligence?.audience_sentiment ?? EMPTY_REPORT.global_intelligence.audience_sentiment,
      industry_news: data.global_intelligence?.industry_news ?? EMPTY_REPORT.global_intelligence.industry_news,
      strategic_opportunities: data.global_intelligence?.strategic_opportunities ?? EMPTY_REPORT.global_intelligence.strategic_opportunities,
    },
    day_capsules: data.day_capsules ?? EMPTY_REPORT.day_capsules,
  };
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 mb-4">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-[0.18em]">{title}</h3>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">{subtitle}</span>
    </div>
  );
}

function SelectableCard({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={`text-left p-4 rounded-2xl border transition-all ${
        checked
          ? "border-black bg-white shadow-sm"
          : "border-gray-200 bg-white/60 opacity-70 hover:opacity-100 hover:border-gray-400"
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function IntelligenceItemView({ item }: { item: IntelligenceItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-sm text-gray-900">{item.title}</div>
        <SourceBadge source={item.source} />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
    </div>
  );
}

function SignalView({ signal }: { signal: IntelligenceSignal }) {
  const urgencyValue = signal.urgency || signal.importance;
  const implicationText =
    signal.implication ||
    (signal.significance ? `Significance: ${signal.significance}` : "") ||
    signal.description;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{signal.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700">
              {signal.type}
            </span>
            <ImportanceBadge importance={urgencyValue} />
          </div>
        </div>
        <SourceBadge source={signal.source} />
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">{signal.description}</p>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-1">Signal Insight</div>
        <p className="text-sm text-gray-800 leading-relaxed">{implicationText}</p>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source?: string }) {
  // Defensive check: fallback to empty string if source is undefined/null
  const value = (source || "").toLowerCase();

  if (value.includes("reddit")) {
    return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-800">Reddit</span>;
  }

  if (value.includes("perplexity")) {
    return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800">Perplexity</span>;
  }

  if (value.includes("calendar")) {
    return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-800">Calendarific</span>;
  }

  return <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700">{source || "System"}</span>;
}

function ImportanceBadge({ importance }: { importance?: string }) {
  // Defensive check: fallback to empty string if importance is undefined/null
  const value = (importance || "").toLowerCase();

  if (value === "critical") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-800">Critical</span>;
  }

  if (value === "high") {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800">High</span>;
  }

  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-700">{importance || "Normal"}</span>;
}
