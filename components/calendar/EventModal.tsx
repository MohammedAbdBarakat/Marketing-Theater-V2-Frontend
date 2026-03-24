"use client";
import type { CalendarEntry } from "../../store/useRunStore";

export function EventModal({ entry, onClose }: { entry: CalendarEntry | null; onClose: () => void }) {
  if (!entry) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="flex justify-between items-start px-6 py-5 border-b border-gray-100 bg-gray-50">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
              {entry.date} • {entry.posting_time || "Time TBD"}
            </div>
            <div className="text-xl font-black text-gray-900 leading-tight">{entry.title}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-black bg-gray-200/50 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">
            ✕
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white">
          
          {/* Phase 2: Strategy & Skeleton */}
          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-[10px] text-gray-400 uppercase tracking-widest mb-4">Phase 2: Strategic Plan</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div><b className="text-xs text-gray-500 block mb-1">Platform</b> <span className="capitalize font-medium text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded text-sm">{entry.channel}</span></div>
              <div><b className="text-xs text-gray-500 block mb-1">Format</b> <span className="capitalize font-medium text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded text-sm">{entry.type}</span></div>
              <div className="col-span-2 md:col-span-1"><b className="text-xs text-gray-500 block mb-1">Goal</b> <span className="font-medium text-gray-900">{entry.goal || entry.description || '—'}</span></div>
            </div>

            {entry.reasoning && (
              <div className="space-y-2 mt-4 pt-4 border-t border-gray-200 text-sm">
                {entry.reasoning.goal_reason && <p><b className="text-gray-700">Why this goal?</b> <span className="text-gray-600">{entry.reasoning.goal_reason}</span></p>}
                {entry.reasoning.topic_reason && <p><b className="text-gray-700">Why this topic?</b> <span className="text-gray-600">{entry.reasoning.topic_reason}</span></p>}
                {entry.reasoning.type_reason && <p><b className="text-gray-700">Why this format?</b> <span className="text-gray-600">{entry.reasoning.type_reason}</span></p>}
                {entry.reasoning.signals_used && entry.reasoning.signals_used.length > 0 && (
                  <p className="mt-2"><b className="text-gray-700">Intelligence Signals Used:</b> <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">{entry.reasoning.signals_used.join(", ")}</span></p>
                )}
              </div>
            )}
          </div>

          {/* Phase 3: Creative Fill */}
          {entry.creative ? (
            <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30">
              <h3 className="font-bold text-[10px] text-blue-500 uppercase tracking-widest mb-4">Phase 3: Creative Execution</h3>
              <div className="space-y-4 text-sm">
                {entry.creative.hook && <div><b className="text-xs text-gray-500 block mb-1">Hook</b> <p className="text-gray-900 font-bold text-base">{entry.creative.hook}</p></div>}
                {entry.creative.caption && <div><b className="text-xs text-gray-500 block mb-1">Caption</b> <p className="text-gray-800 whitespace-pre-wrap leading-relaxed">{entry.creative.caption}</p></div>}
                {entry.creative.cta && <div><b className="text-xs text-gray-500 block mb-1">Call to Action</b> <p className="text-gray-900 font-medium">{entry.creative.cta}</p></div>}
                {entry.creative.hashtags && entry.creative.hashtags.length > 0 && <div><b className="text-xs text-gray-500 block mb-1">Hashtags</b> <p className="text-blue-600 font-medium">{entry.creative.hashtags.join(" ")}</p></div>}
                
                {entry.creative.visual_direction && (
                  <div className="mt-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                    <b className="text-[10px] text-purple-600 uppercase tracking-widest block mb-2">Visual Direction</b>
                    <p className="text-purple-900 mb-1"><b className="font-semibold">Mood:</b> {entry.creative.visual_direction.mood}</p>
                    <p className="text-purple-800 italic"><b className="font-semibold not-italic">Hint:</b> {entry.creative.visual_direction.style_hint}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-sm text-gray-400 italic">
               Creative Phase data not yet generated for this post.
             </div>
          )}

        </div>
      </div>
    </div>
  );
}