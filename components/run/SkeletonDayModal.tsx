"use client";
import React from "react";
import type { CalendarEntry } from "../../store/useRunStore";

interface SkeletonDayModalProps {
    open: boolean;
    entry: CalendarEntry | null;
    onClose: () => void;
}

export function SkeletonDayModal({ open, entry, onClose }: SkeletonDayModalProps) {
    if (!open || !entry) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div 
                className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200"
                onClick={(e) => e.stopPropagation()} // Prevent click-through closing
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Goal: {entry.goal || "Draft"}</span>
                        <h2 className="text-xl font-black text-black leading-tight">{entry.title || "Subject"}</h2>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-black transition-colors"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-6">
                    {/* Meta Grid */}
                    <div className="grid grid-cols-3 gap-4 border-b border-gray-100 pb-5">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Platform</span>
                            <span className="text-sm font-bold capitalize text-gray-900">{entry.channel || "Platform"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Format</span>
                            <span className="text-sm font-bold uppercase text-gray-900">{entry.type || "Content"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time</span>
                            <span className="text-sm font-mono font-bold text-gray-900">{entry.posting_time || "12:00"}</span>
                        </div>
                    </div>

                    {/* Reasoning Section */}
                    {entry.reasoning ? (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-900 border-b border-gray-100 pb-2">Agent Logic</h3>
                            
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm border border-gray-100">
                                {entry.reasoning.topic_reason && (
                                    <div className="flex items-start gap-3">
                                        <span className="text-gray-400 font-bold uppercase shrink-0 mt-0.5 w-10" style={{ fontSize: '10px' }}>Topic</span>
                                        <p className="text-gray-700 font-medium leading-relaxed">{entry.reasoning.topic_reason}</p>
                                    </div>
                                )}
                                {entry.reasoning.type_reason && (
                                    <div className="flex items-start gap-3 border-t border-gray-200/50 pt-2">
                                        <span className="text-gray-400 font-bold uppercase shrink-0 mt-0.5 w-10" style={{ fontSize: '10px' }}>Format</span>
                                        <p className="text-gray-700 font-medium leading-relaxed">{entry.reasoning.type_reason}</p>
                                    </div>
                                )}
                                {entry.reasoning.signals_used && entry.reasoning.signals_used.length > 0 && (
                                    <div className="flex items-start gap-3 border-t border-gray-200/50 pt-2">
                                        <span className="text-gray-400 font-bold uppercase shrink-0 mt-0.5 w-10 text-[10px]" style={{ fontSize: '10px' }}>Signals</span>
                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                            {entry.reasoning.signals_used.map((sig, i) => (
                                                <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase">
                                                    {sig}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-gray-400 italic text-center py-4">No agent reasoning provided for this card.</div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-black text-white text-xs font-bold uppercase tracking-wider rounded transition-colors hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
