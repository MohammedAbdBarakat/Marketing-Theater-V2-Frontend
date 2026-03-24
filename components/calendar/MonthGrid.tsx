"use client";
import Link from "next/link";
import dayjs from "dayjs";
import type { CalendarEntry } from "../../store/useRunStore";
import { useRunStore } from "../../store/useRunStore";

export function MonthGrid({
  monthISO,
  entriesByDay,
  onEventClick,
  dayHref,
}: {
  monthISO: string;
  entriesByDay: Record<string, CalendarEntry[]>;
  onEventClick?: (e: CalendarEntry) => void;
  dayHref?: (dateISO: string) => string;
}) {
  // Grab the Phase 1 Signals from the global store
  const signalsData = useRunStore((state) => state.signalsData);

  const start = dayjs(monthISO).startOf("month");
  const end = dayjs(monthISO).endOf("month");
  const days: dayjs.Dayjs[] = [];
  let c = start.startOf("week");
  const last = end.endOf("week");
  
  while (c.isBefore(last) || c.isSame(last, "day")) {
    days.push(c);
    c = c.add(1, "day");
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, idx) => {
        const key = d.format("YYYY-MM-DD");
        const entries = entriesByDay[key] || [];
        const faded = d.month() !== start.month();
        
        // Find Phase 1 Signals for this specific day
        const dayCapsule = signalsData?.day_capsules?.find((capsule) => capsule.date === key);
        const daySignals = dayCapsule?.signals || [];

        return (
          <div key={idx} className={`min-h-24 border border-gray-200 rounded-lg p-2 bg-gray-50/30 ${faded ? 'opacity-50' : ''}`}>
            
            {/* Header: Date Number & Open Link */}
            <div className="flex items-center justify-between mb-1.5">
              {dayHref ? (
                <Link href={dayHref(key)} className="text-xs font-bold text-gray-500 hover:text-black transition-colors">
                  {d.date()}
                </Link>
              ) : (
                <div className="text-xs font-bold text-gray-500">{d.date()}</div>
              )}
              {dayHref && entries.length ? (
                <Link href={dayHref(key)} className="text-[10px] uppercase tracking-wider font-bold text-gray-400 hover:text-black transition-colors">
                  Open Day
                </Link>
              ) : null}
            </div>

            <div className="space-y-1.5">
              {/* ✨ OPTION A: Render Phase 1 Intelligence Signals as Badges */}
              {daySignals.map((signal, sIdx) => (
                 <div key={`sig-${sIdx}`} className="px-1.5 py-1 bg-yellow-100 border border-yellow-200 rounded text-[9px] text-yellow-800 font-semibold leading-tight truncate shadow-sm" title={signal.description}>
                   📌 {signal.name}
                 </div>
              ))}

              {/* Render Phase 2/3 Scheduled Posts */}
              {entries.slice(0, 3).map((e) => (
                <button 
                  key={e.id} 
                  className="block w-full text-left p-2 rounded-md bg-white border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all group" 
                  onClick={() => onEventClick?.(e)}
                >
                  <div className="flex items-center justify-between mb-1 opacity-70">
                    <span className="text-[9px] font-black uppercase tracking-wider text-gray-600 truncate max-w-[70px]">{e.channel}</span>
                    <span className="text-[9px] text-gray-500 font-bold uppercase">{e.type.slice(0, 3)}</span>
                  </div>
                  <div className="text-[11px] leading-tight text-gray-900 font-bold truncate group-hover:text-blue-600 transition-colors">
                    {e.title}
                  </div>
                </button>
              ))}
              
              {entries.length > 3 && (
                <div className="text-[10px] font-bold text-gray-400 text-center pt-1">
                  +{entries.length - 3} more posts
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}