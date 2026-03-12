"use client";
import React, { useState, useEffect } from "react";
type MarketImplication = {
    id: string;
    title: string;
    description: string;
    urgency: string;
    category: string;
    source: string;
};

type DayCapsule = {
    id: string;
    date: string;
    event_name: string;
    significance: string;
    suggested_angle: string;
    source: string;
};

interface SignalsReviewModalProps {
    open: boolean;
    data: {
        market_implications: MarketImplication[];
        day_capsules: DayCapsule[];
    } | null;
    onConfirm: (approvedData: any) => void;
}

export function SignalsReviewModal({ open, data, onConfirm }: SignalsReviewModalProps) {
    // Keep track of which signals the user wants to KEEP
    const [selectedImplications, setSelectedImplications] = useState<Set<string>>(new Set());
    const [selectedCapsules, setSelectedCapsules] = useState<Set<string>>(new Set());

    // Auto-select all by default when data loads
    useEffect(() => {
        if (data) {
            setSelectedImplications(new Set(data.market_implications.map(i => i.id)));
            setSelectedCapsules(new Set(data.day_capsules.map(c => c.id)));
        }
    }, [data]);

    if (!open || !data) return null;

    const toggleImplication = (id: string) => {
        const next = new Set(selectedImplications);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedImplications(next);
    };

    const toggleCapsule = (id: string) => {
        const next = new Set(selectedCapsules);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedCapsules(next);
    };

    const handleApprove = () => {
        const approvedData = {
            market_implications: data.market_implications.filter(i => selectedImplications.has(i.id)),
            day_capsules: data.day_capsules.filter(c => selectedCapsules.has(c.id))
        };
        onConfirm(approvedData);
    };

    // Helper to render cute source badges
    const renderSourceBadge = (source: string) => {
        if (source.includes("reddit")) return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Reddit</span>;
        if (source.includes("perplexity")) return <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Perplexity</span>;
        if (source.includes("calendar")) return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Calendarific</span>;
        return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{source}</span>;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Intelligence Review</h2>
                        <p className="text-sm text-gray-500 mt-1">Select the signals you want the AI War Room to use.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{selectedImplications.size + selectedCapsules.size}</div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Signals Selected</div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white custom-scrollbar">
                    
                    {/* Market Implications Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Market & Audience Trends</h3>
                        <div className="grid gap-3">
                            {data.market_implications.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => toggleImplication(item.id)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedImplications.has(item.id) ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                >
                                    <div className="flex gap-3">
                                        <div className="pt-1">
                                            <input type="checkbox" checked={selectedImplications.has(item.id)} readOnly className="w-4 h-4 text-black focus:ring-black rounded border-gray-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-1">
                                                <span className="font-semibold text-sm text-gray-900">{item.title}</span>
                                                {renderSourceBadge(item.source)}
                                            </div>
                                            <p className="text-sm text-gray-600 leading-relaxed mb-2">{item.description}</p>
                                            <div className="flex gap-2">
                                                <span className="text-[10px] bg-white border px-2 py-0.5 rounded text-gray-500 font-medium">{item.category}</span>
                                                <span className={`text-[10px] border px-2 py-0.5 rounded font-medium ${item.urgency.toLowerCase() === 'high' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-white text-gray-500'}`}>{item.urgency} Urgency</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Day Capsules Section */}
                    <section>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b pb-2">Key Dates & Holidays</h3>
                        <div className="grid gap-3">
                            {data.day_capsules.map((capsule) => (
                                <div 
                                    key={capsule.id} 
                                    onClick={() => toggleCapsule(capsule.id)}
                                    className={`p-4 border rounded-xl cursor-pointer transition-all ${selectedCapsules.has(capsule.id) ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-200 opacity-60 hover:opacity-100'}`}
                                >
                                     <div className="flex gap-3">
                                        <div className="pt-1">
                                            <input type="checkbox" checked={selectedCapsules.has(capsule.id)} readOnly className="w-4 h-4 text-black focus:ring-black rounded border-gray-300" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-1">
                                                <div>
                                                    <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-2">{capsule.date}</span>
                                                    <span className="font-semibold text-sm text-gray-900">{capsule.event_name}</span>
                                                </div>
                                                {renderSourceBadge(capsule.source)}
                                            </div>
                                            <p className="text-xs text-gray-500 mb-2 italic">{capsule.significance}</p>
                                            <div className="bg-white border rounded p-2 text-sm text-gray-700">
                                                <span className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Suggested Angle:</span>
                                                {capsule.suggested_angle}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t bg-white flex justify-end gap-3">
                    <button 
                        onClick={() => handleApprove()}
                        className="bg-black hover:bg-gray-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        Approve & Enter War Room
                        <span>→</span>
                    </button>
                </div>

            </div>
        </div>
    );
}