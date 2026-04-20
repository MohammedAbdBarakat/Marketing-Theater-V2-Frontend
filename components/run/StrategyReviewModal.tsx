"use client";
import React, { useState, useEffect } from "react";

interface StrategyReviewModalProps {
    open: boolean;
    data: any | null; // The MasterStrategy object
    onConfirm: (editedData: any) => void;
    onClose?: () => void;
}

export function StrategyReviewModal({ open, data, onConfirm, onClose }: StrategyReviewModalProps) {
    const [strategy, setStrategy] = useState<any>(null);

    useEffect(() => {
        if (data) {
            // Deep copy to avoid mutating props directly if it's an object reference
            setStrategy(JSON.parse(JSON.stringify(data)));
        }
    }, [data, open]);

    if (!open || !strategy) return null;

    const handleApprove = () => {
        onConfirm(strategy);
    };

    const updateField = (field: string, value: any) => {
        setStrategy((prev: any) => ({ ...prev, [field]: value }));
    };

    const updatePlatformWeight = (platform: string, value: number) => {
        setStrategy((prev: any) => ({
            ...prev,
            distribution_plan: {
                ...prev.distribution_plan,
                platform_weights: {
                    ...prev.distribution_plan?.platform_weights,
                    [platform]: value
                }
            }
        }));
    };

    const updateOptimalTime = (dayType: string, timeValue: string) => {
        setStrategy((prev: any) => ({
            ...prev,
            distribution_plan: {
                ...prev.distribution_plan,
                optimal_times: {
                    ...prev.distribution_plan?.optimal_times,
                    [dayType]: timeValue
                }
            }
        }));
    };

    const updateContentMix = (type: string, value: number) => {
        setStrategy((prev: any) => ({
            ...prev,
            distribution_plan: {
                ...prev.distribution_plan,
                content_mix: {
                    ...prev.distribution_plan?.content_mix,
                    [type]: value
                }
            }
        }));
    };

    const updateArcPhase = (index: number, field: string, value: any) => {
        setStrategy((prev: any) => {
            const newArc = [...(prev.campaign_arc || [])];
            newArc[index] = { ...newArc[index], [field]: value };
            return { ...prev, campaign_arc: newArc };
        });
    };

    const totalPlatformWeight = Object.values(strategy.distribution_plan?.platform_weights || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    const totalFormatMix = Object.values(strategy.distribution_plan?.content_mix || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0);
    
    const isInvalid = totalPlatformWeight > 1.001 || totalFormatMix > 1.001; // small threshold for float math

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-start">
                    <div>
                        <div className="inline-block px-3 py-1 bg-black text-white text-[10px] font-bold tracking-widest uppercase mb-3 rounded-sm">
                            Phase 2 · Stage A Complete
                        </div>
                        <h2 className="text-3xl font-black text-black tracking-tight">Master Strategy Lock</h2>
                        <p className="text-sm text-gray-500 mt-2 font-medium max-w-xl leading-relaxed">
                            The War Room has synthesized the intelligence into a core strategy. Review and tune the parameters below before confirming. This will dictate all content generation.
                        </p>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"
                            aria-label="Close"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    )}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Left Column: Core Identity */}
                        <div className="space-y-4">
                            <section className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Core Narrative</h3>
                                
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Strategy Title</label>
                                        <input 
                                            type="text" 
                                            className="w-full text-sm p-3 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none transition-all font-medium"
                                            value={strategy.strategy_title || ""}
                                            onChange={(e) => updateField('strategy_title', e.target.value)}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Core Message</label>
                                        <textarea 
                                            className="w-full text-sm p-3 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black outline-none transition-all min-h-[80px] resize-none"
                                            value={strategy.core_message || ""}
                                            onChange={(e) => updateField('core_message', e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-black mb-2">Strategic Rationale</label>
                                        <textarea 
                                            readOnly
                                            className="w-full text-sm p-3 border border-gray-300 rounded outline-none min-h-[100px] resize-none text-gray-500 bg-gray-100 cursor-not-allowed"
                                            value={strategy.rationale || ""}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                                <div className="flex justify-between items-baseline border-b border-gray-100 pb-2 mb-4">
                                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Campaign Arc</h3>
                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{strategy.campaign_arc?.length || 0} Phases</span>
                                </div>
                                
                                <div className="space-y-4">
                                    {(strategy.campaign_arc || []).map((arc: any, idx: number) => (
                                        <div key={idx} className="p-4 border border-gray-200 rounded-md hover:border-black transition-colors">
                                            <div className="flex justify-between items-center mb-3">
                                                <input 
                                                    type="text" 
                                                    className="font-bold text-sm border-none p-0 focus:ring-0 w-1/2"
                                                    value={arc.phase_name || ""}
                                                    onChange={(e) => updateArcPhase(idx, 'phase_name', e.target.value)}
                                                />
                                                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                                                    Day {arc.day_start} - {arc.day_end}
                                                </div>
                                            </div>
                                            <textarea 
                                                className="w-full text-xs p-2 border border-gray-200 rounded focus:border-black outline-none resize-none"
                                                rows={2}
                                                value={arc.focus || ""}
                                                onChange={(e) => updateArcPhase(idx, 'focus', e.target.value)}
                                                placeholder="Phase focus..."
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Right Column: Distribution & Technicals */}
                        <div className="space-y-4">
                            
                            <section className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Distribution Plan</h3>
                                
                                <div className="space-y-5">
                                    {/* Platform Weights */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-bold text-black">Platform Allocation</h4>
                                            <span className={`text-[10px] font-bold ${totalPlatformWeight > 1.001 ? 'text-red-500' : 'text-gray-400'}`}>
                                                TOTAL: {totalPlatformWeight.toFixed(2)} / 1.0
                                            </span>
                                        </div>
                                        {totalPlatformWeight > 1.001 && <p className="text-[10px] text-red-500 mb-2 font-medium">Sum cannot exceed 1.0</p>}
                                        <div className="space-y-4">
                                            {Object.entries(strategy.distribution_plan?.platform_weights || {}).map(([platform, weight]: [string, any]) => (
                                                <div key={platform} className="p-3 border border-gray-200 rounded">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold uppercase capitalize">{platform}</span>
                                                        <span className="text-xs font-mono font-bold text-black">{(weight * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" max="1" step="0.05"
                                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                                                        value={weight || 0}
                                                        onChange={(e) => updatePlatformWeight(platform, parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content Mix */}
                                    <div className="pt-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-bold text-black">Format Mix</h4>
                                            <span className={`text-[10px] font-bold ${totalFormatMix > 1.001 ? 'text-red-500' : 'text-gray-400'}`}>
                                                TOTAL: {totalFormatMix.toFixed(2)} / 1.0
                                            </span>
                                        </div>
                                        {totalFormatMix > 1.001 && <p className="text-[10px] text-red-500 mb-2 font-medium">Sum cannot exceed 1.0</p>}
                                        <div className="space-y-4">
                                            {Object.entries(strategy.distribution_plan?.content_mix || {}).map(([type, weight]: [string, any]) => (
                                                <div key={type} className="p-3 border border-gray-200 rounded">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold uppercase">{type}</span>
                                                        <span className="text-xs font-mono font-bold text-black">{(weight * 100).toFixed(0)}%</span>
                                                    </div>
                                                    <input 
                                                        type="range" 
                                                        min="0" max="1" step="0.05"
                                                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                                                        value={weight || 0}
                                                        onChange={(e) => updateContentMix(type, parseFloat(e.target.value))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Timing */}
                                    <div className="pt-2">
                                        <h4 className="text-xs font-bold text-black mb-2">Posting Cadence</h4>
                                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-600">Optimal Time</span>
                                                <input 
                                                    type="time" 
                                                    className="bg-white border border-gray-200 text-sm font-bold font-mono py-1 px-2 rounded-md focus:border-black focus:ring-1 focus:ring-black outline-none"
                                                    value={strategy.distribution_plan?.optimal_times?.weekday || "18:00"}
                                                    onChange={(e) => updateOptimalTime("weekday", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-black p-5 rounded-lg shadow-xl text-white">
                                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-2 mb-4">Intelligence Synthesis</h3>
                                <p className="text-xs text-gray-400 mb-4 leading-relaxed">The AI has incorporated the following approved signals into this master strategy:</p>
                                <ul className="space-y-2">
                                    {(strategy.intelligence_signals_used || []).map((sig: string, idx: number) => (
                                        <li key={idx} className="text-sm flex items-start gap-2">
                                            <span className="text-gray-500 mt-0.5">↳</span>
                                            <span className="font-medium">{sig}</span>
                                        </li>
                                    ))}
                                    {(!strategy.intelligence_signals_used || strategy.intelligence_signals_used.length === 0) && (
                                        <li className="text-sm text-gray-500 italic">No specific signals were highly weighted.</li>
                                    )}
                                </ul>
                            </section>

                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-gray-200 bg-white flex justify-between items-center">
                    <button 
                        onClick={() => onConfirm(data)} // Resets by passing original Data
                        className="text-xs font-bold text-gray-500 hover:text-black transition-colors"
                    >
                        Reset to AI Default
                    </button>
                    <button 
                        onClick={handleApprove}
                        disabled={isInvalid}
                        className={`px-8 py-3 rounded-lg text-sm font-black uppercase tracking-wide flex items-center gap-3 transition-all shadow-md ${
                            isInvalid 
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                            : "bg-black hover:bg-gray-800 text-white hover:shadow-lg active:scale-95"
                        }`}
                    >
                        Confirm Strategy Lock
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
                </div>

            </div>
        </div>
    );
}
