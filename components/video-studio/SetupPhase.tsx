import { useEffect, useState } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { fetchArchetypes, fetchProtagonists, fetchVoiceovers } from "../../lib/videoStudioApi";

export function SetupPhase() {
    const { config, updateConfig, options, setOptions } = useVideoStudioStore();
    const [activeInfoId, setActiveInfoId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        async function loadOptions() {
            setOptions({ loading: true });
            try {
                const [archetypes, protagonists, voiceovers] = await Promise.all([
                    fetchArchetypes(),
                    fetchProtagonists(),
                    fetchVoiceovers()
                ]);

                if (mounted) {
                    setOptions({
                        archetypes,
                        protagonists,
                        voiceovers,
                        loading: false
                    });

                    // Set intelligent defaults if not already set
                    if (!config.archetype_id && archetypes.length > 0) {
                        updateConfig({ archetype_id: archetypes[0].id });
                    }
                    if (!config.voice_model && voiceovers.length > 0) {
                        updateConfig({ voice_model: voiceovers[0].id });
                    }
                    if (!config.protagonist_id && protagonists.length > 0) {
                        updateConfig({ protagonist_id: protagonists[0].id });
                    }
                }
            } catch (e) {
                console.error("Failed to load setup options", e);
                if (mounted) setOptions({ loading: false });
            }
        }

        if (options.archetypes.length === 0) {
            loadOptions();
        }
    }, [config.archetype_id, config.voice_model, config.protagonist_id, options.archetypes.length, setOptions, updateConfig]);

    if (options.loading) {
        return (
            <div className="flex-grow flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-black" />
            </div>
        );
    }

    return (
        <div className="flex-grow overflow-y-auto px-8 custom-scrollbar">
            {/* Switched to a flex column layout to stack the grid and the full-width section */}
            <div className="flex flex-col gap-12 py-8 pb-32">

                {/* Top Section: Original Two Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Left Column (Asset Uploads) */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500 mb-6 font-bold">Visual Foundation</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Product Image */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Product</label>
                                    <div className="aspect-square bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-black transition-colors">inventory_2</span>
                                        <span className="text-[10px] mt-2 text-gray-400">Upload</span>
                                    </div>
                                </div>

                                {/* Character Reference */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Character</label>
                                    <div className="aspect-square bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-black transition-colors">person</span>
                                        <span className="text-[10px] mt-2 text-gray-400">Reference</span>
                                    </div>
                                </div>

                                {/* Brand Logo */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Brand Logo</label>
                                    <div className="aspect-square bg-white border border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group">
                                        <span className="material-symbols-outlined text-gray-400 group-hover:text-black transition-colors">branding_watermark</span>
                                        <span className="text-[10px] mt-2 text-gray-400">SVG/PNG</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Protagonist Template</label>
                                <div className="relative">
                                    <select
                                        value={config.protagonist_id || ""}
                                        onChange={(e) => updateConfig({ protagonist_id: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-black focus:border-black appearance-none text-gray-900"
                                    >
                                        {options.protagonists.map(p => (
                                            <option key={p.id} value={p.id}>{p.label}</option>
                                        ))}
                                        <option value="custom">Custom Protagonist</option>
                                    </select>
                                    <span className="material-symbols-outlined absolute right-3 top-3.5 text-gray-400 pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {config.protagonist_id === 'custom' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Protagonist description</label>
                                    <textarea
                                        value={config.custom_protagonist_desc}
                                        onChange={(e) => updateConfig({ custom_protagonist_desc: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-lg p-4 text-sm focus:ring-1 focus:ring-black h-24 resize-none placeholder:text-gray-300 text-gray-900"
                                        placeholder="Describe the main subject's appearance and personality..."
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (Controls without Archetypes) */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500 mb-6 font-bold">Cinematography & Logic</h2>

                            {/* Scene Count */}
                            <div className="space-y-4 mb-8">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Scene Count</label>
                                    <span className="text-black font-bold text-lg">0{config.scene_count}</span>
                                </div>
                                <input
                                    className="w-full accent-black cursor-pointer"
                                    max="5" min="2" step="1" type="range"
                                    value={config.scene_count}
                                    onChange={(e) => updateConfig({ scene_count: parseInt(e.target.value) })}
                                />
                                <div className="flex justify-between text-[10px] text-gray-400 px-1 font-bold">
                                    <span>2</span>
                                    <span>3</span>
                                    <span>4</span>
                                    <span>5</span>
                                </div>
                            </div>

                            {/* Aspect Ratio */}
                            <div className="space-y-4 mb-8">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Aspect Ratio</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: "9:16", icon: <div className="w-4 h-7 border-2 rounded-sm mb-2" /> },
                                        { id: "16:9", icon: <div className="w-7 h-4 border-2 rounded-sm mb-2" /> },
                                        { id: "1:1", icon: <div className="w-5 h-5 border-2 rounded-sm mb-2" /> },
                                    ].map((ratio) => {
                                        const isActive = config.aspect_ratio === ratio.id;
                                        return (
                                            <button
                                                key={ratio.id}
                                                onClick={() => updateConfig({ aspect_ratio: ratio.id })}
                                                className={`p-4 rounded-lg flex flex-col items-center justify-center transition-all ${isActive
                                                    ? 'bg-gray-50 border border-black'
                                                    : 'bg-white border border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className={`${isActive ? 'border-black' : 'border-gray-400'}`}>
                                                    {ratio.icon}
                                                </div>
                                                <span className={`text-[10px] font-bold ${isActive ? 'text-black' : 'text-gray-500'}`}>
                                                    {ratio.id}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Transition & Audio */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Transition Mode</label>
                                <div className="bg-gray-100 p-1 rounded-lg flex border border-gray-200">
                                    <button
                                        onClick={() => updateConfig({ transition_mode: "auto" })}
                                        className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${config.transition_mode === 'auto'
                                            ? 'bg-white shadow-sm text-black border border-gray-200'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        Auto
                                    </button>
                                    <button
                                        onClick={() => updateConfig({ transition_mode: "morph" })}
                                        className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${config.transition_mode === 'morph'
                                            ? 'bg-white shadow-sm text-black border border-gray-200'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        Morph
                                    </button>
                                    <button
                                        onClick={() => updateConfig({ transition_mode: "extend" })}
                                        className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${config.transition_mode === 'extend'
                                            ? 'bg-white shadow-sm text-black border border-gray-200'
                                            : 'text-gray-500 hover:text-black'
                                            }`}
                                    >
                                        Extend
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">Voiceover</label>
                                    <button
                                        role="switch"
                                        aria-checked={config.voiceover_enabled}
                                        onClick={() => updateConfig({ voiceover_enabled: !config.voiceover_enabled })}
                                        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${config.voiceover_enabled ? 'bg-black' : 'bg-gray-200'
                                            }`}
                                    >
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${config.voiceover_enabled ? 'translate-x-5' : 'translate-x-0'
                                            }`} />
                                    </button>
                                </div>

                                {config.voiceover_enabled && (
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Voice Model</label>
                                        <div className="relative">
                                            <select
                                                value={config.voice_model}
                                                onChange={(e) => updateConfig({ voice_model: e.target.value })}
                                                className="w-full bg-white border border-gray-200 rounded-lg py-2 pl-3 pr-8 text-xs font-bold focus:ring-1 focus:ring-black appearance-none text-gray-900"
                                            >
                                                {options.voiceovers.map((voice) => (
                                                    <option key={voice.id} value={voice.id}>
                                                        {voice.name} ({voice.gender}, {voice.style})
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1.5 text-xs text-gray-400 pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Section: Full Width Archetypes */}
                <div className="pt-6 border-t border-gray-200">
                    <h2 className="text-xs font-medium uppercase tracking-[0.15em] text-gray-500 mb-6 font-bold">Visual Archetype</h2>

                    {/* Removed max-height and custom-scrollbar, expanded grid cols */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {options.archetypes.map((arch) => {
                            const isActive = config.archetype_id === arch.id;
                            const isInfoActive = activeInfoId === arch.id;

                            return (
                                <button
                                    key={arch.id}
                                    onClick={() => updateConfig({ archetype_id: arch.id })}
                                    // Softened height constraints (min-h-[5rem]), added padding
                                    className={`rounded-lg border text-left transition-all duration-300 relative flex flex-col p-5 overflow-hidden ${isActive ? "bg-gray-50 border-black shadow-sm" : "bg-white border-gray-200 hover:border-gray-300"
                                        } min-h-[5rem]`}
                                >
                                    {/* Info Toggle Button */}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveInfoId(isInfoActive ? null : arch.id);
                                        }}
                                        className={`absolute top-2 right-2 z-10 transition-transform duration-300 cursor-pointer flex items-center justify-center w-6 h-6 rounded-full hover:bg-gray-100 ${isInfoActive
                                            ? 'text-black bg-gray-100 rotate-180'
                                            : 'text-gray-400 hover:text-black'
                                            }`}
                                        title="View Description"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            {isInfoActive ? 'close' : 'info'}
                                        </span>
                                    </div>

                                    {/* Name formatting dynamically adjusts based on state */}
                                    <div className={`font-bold transition-all duration-300 ease-in-out pr-6 ${isInfoActive ? "text-xs mb-2" : "text-sm my-auto"
                                        }`}
                                    >
                                        {arch.name}
                                    </div>

                                    {/* Description expands naturally now that max height restrictions are gone */}
                                    <div className={`text-[11px] text-gray-500 leading-relaxed transition-all duration-300 ease-in-out overflow-hidden ${isInfoActive ? "opacity-100 max-h-32 mt-1" : "opacity-0 max-h-0"
                                        }`}
                                    >
                                        {arch.description}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}