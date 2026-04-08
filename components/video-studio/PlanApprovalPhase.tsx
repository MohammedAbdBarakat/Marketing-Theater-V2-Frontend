import { useState } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";

export function PlanApprovalPhase() {
    const { blueprint, generationStatus, updateScenePrompt, updateVoiceoverScript } = useVideoStudioStore();
    const [editingScene, setEditingScene] = useState<number | null>(null);
    const [editingVoiceover, setEditingVoiceover] = useState(false);

    // Loading state — plan is being generated
    if (generationStatus === "generating_plan") {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4">
                <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-black" />
                    <span className="material-symbols-outlined absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-400 text-lg">
                        magic_button
                    </span>
                </div>
                <p className="text-sm font-bold text-gray-900 tracking-wide">Generating your plan…</p>
                <p className="text-xs text-gray-400">Our AI director is crafting your video blueprint</p>
            </div>
        );
    }

    // Empty state — no blueprint yet
    if (!blueprint) {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 text-gray-400">
                <span className="material-symbols-outlined text-5xl text-gray-300">article</span>
                <p className="text-sm font-medium">No plan generated yet</p>
                <p className="text-xs">Go back to Setup and click &quot;Generate Plan&quot;</p>
            </div>
        );
    }

    // Document view
    return (
        <div className="flex-grow overflow-y-auto px-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto py-8 pb-32 space-y-8">

                {/* Header */}
                <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Video Blueprint</h2>
                    <p className="text-xs text-gray-400">Review and refine each scene before rendering</p>
                </div>

                {/* Metadata Chips */}
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        <span className="material-symbols-outlined text-[12px]">aspect_ratio</span>
                        {blueprint.aspect_ratio}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        <span className="material-symbols-outlined text-[12px]">movie</span>
                        {blueprint.ad_archetype}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        <span className="material-symbols-outlined text-[12px]">swap_horiz</span>
                        {blueprint.transition_mode}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                        <span className="material-symbols-outlined text-[12px]">theaters</span>
                        {blueprint.scenes.length} scenes
                    </span>
                </div>

                {/* Scene Cards */}
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Scene Breakdown</h3>

                    {blueprint.scenes.map((scene, index) => {
                        const isEditing = editingScene === scene.scene_index;
                        return (
                            <div
                                key={scene.scene_index}
                                className="bg-white border border-gray-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm"
                            >{/* Scene Header */}
                                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-7 h-7 bg-black text-white rounded-md text-[10px] font-bold">
                                            {/* 2. Change this to use the array 'index' instead of 'scene.scene_index' */}
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                            {scene.role}
                                        </span>
                                        {scene.transition_method && (
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[11px]">swap_horiz</span>
                                                {scene.transition_method}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setEditingScene(isEditing ? null : scene.scene_index)}
                                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[14px]">
                                            {isEditing ? 'check' : 'edit'}
                                        </span>
                                        {isEditing ? 'Done' : 'Edit'}
                                    </button>
                                </div>

                                {/* Scene Prompt */}
                                <div className="px-5 py-4">
                                    {isEditing ? (
                                        <textarea
                                            value={scene.veo_prompt}
                                            onChange={(e) => updateScenePrompt(scene.scene_index, e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm leading-relaxed focus:ring-1 focus:ring-black focus:border-black resize-none text-gray-900 min-h-[100px]"
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {scene.veo_prompt}
                                        </p>
                                    )}

                                    {/* Reference tags */}
                                    {scene.reference_tags_used.length > 0 && (
                                        <div className="mt-3 flex gap-1.5">
                                            {scene.reference_tags_used.map(tag => (
                                                <span key={tag} className="text-[9px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">
                                                    ref: {tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Voiceover Script */}
                {blueprint.needs_voiceover && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Voiceover Script</h3>
                            <button
                                onClick={() => setEditingVoiceover(!editingVoiceover)}
                                className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-black transition-colors"
                            >
                                <span className="material-symbols-outlined text-[14px]">
                                    {editingVoiceover ? 'check' : 'edit'}
                                </span>
                                {editingVoiceover ? 'Done' : 'Edit'}
                            </button>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-5">
                            {editingVoiceover ? (
                                <textarea
                                    value={blueprint.voiceover_script}
                                    onChange={(e) => updateVoiceoverScript(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm leading-relaxed focus:ring-1 focus:ring-black focus:border-black resize-none text-gray-900 min-h-[120px]"
                                    autoFocus
                                />
                            ) : (
                                <blockquote className="border-l-2 border-black pl-4 text-sm text-gray-700 leading-relaxed italic">
                                    &ldquo;{blueprint.voiceover_script}&rdquo;
                                </blockquote>
                            )}
                        </div>
                    </div>
                )}

                {/* Protagonist summary */}
                {blueprint.protagonist_profile?.description && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Protagonist</h3>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex items-start gap-3">
                            <span className="material-symbols-outlined text-gray-400 text-lg mt-0.5">person</span>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                                    {blueprint.protagonist_profile.type}
                                </span>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {blueprint.protagonist_profile.description}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
