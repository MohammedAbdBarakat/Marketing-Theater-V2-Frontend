import { useState } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { planVideo, generateVideo } from "../../lib/videoStudioApi";

export function BottomNav() {
    const {
        currentPhase, setPhase, setModalOpen,
        config, options, assetId, blueprint,
        setBlueprint, setGenerationStatus, setVersionId, setTaskId, setGenerationError
    } = useVideoStudioStore();

    const [loading, setLoading] = useState(false);

    const handlePrimaryClick = async () => {
        if (loading) return;

        if (currentPhase === "setup") {
            // ─── Generate Plan ───────────────────────────
            setLoading(true);
            setGenerationStatus("generating_plan");
            setPhase("plan");

            try {
                // Build the payload from store config
                const archetypeName = options.archetypes.find(a => a.id === config.archetype_id)?.name || config.archetype_id;
                const protagonistOption = options.protagonists.find(p => p.id === config.protagonist_id);
                const voiceoverOption = options.voiceovers.find(v => v.id === config.voice_model);

                const protagonistText = config.protagonist_id === "custom"
                    ? config.custom_protagonist_desc
                    : protagonistOption?.description || "";
                const protagonistType = config.protagonist_id === "custom"
                    ? "custom"
                    : protagonistOption?.id || "default";

                const refImages = Object.entries(config.ref_images)
                    .filter(([, url]) => url)
                    .map(([tag, image]) => ({ tag, image }));

                const response = await planVideo(assetId, {
                    scene_count: config.scene_count,
                    aspect_ratio: config.aspect_ratio,
                    transition_mode: config.transition_mode,
                    archetype: { name: archetypeName },
                    protagonist: { text: protagonistText, type: protagonistType },
                    voiceover: {
                        voice_name: voiceoverOption?.name || "",
                        // FIXED: Directly use the literal string from the updated store
                        voice_toggle: config.voiceover_toggle
                    },
                    ref_images: refImages
                });

                setBlueprint(response.blueprint, response.resolved_prompt);
                setGenerationStatus("idle");
            } catch (err) {
                console.error("Failed to generate plan", err);
                setGenerationError("Failed to generate plan. Please try again.");
                setGenerationStatus("failed");
            } finally {
                setLoading(false);
            }

        } else if (currentPhase === "plan") {
            // ─── Approve & Render ────────────────────────
            if (!blueprint) return;

            setLoading(true);
            setGenerationStatus("generating_video");
            setPhase("theater");

            try {
                const refImages = blueprint.ref_images || [];

                const response = await generateVideo(assetId, {
                    blueprint,
                    ref_images: refImages
                });

                setVersionId(response.version_id);
                setTaskId(response.task_id);
                // Status tracking continues via SSE in TheaterPhase
            } catch (err) {
                console.error("Failed to start generation", err);
                setGenerationError("Failed to start video rendering. Please try again.");
                setGenerationStatus("failed");
            } finally {
                setLoading(false);
            }

        } else if (currentPhase === "theater") {
            alert("Export functionality coming soon");
        } else if (currentPhase === "history") {
            setPhase("theater");
        }
    };

    const handleBackClick = () => {
        if (currentPhase === "plan") setPhase("setup");
        else if (currentPhase === "theater") setPhase("plan");
        else if (currentPhase === "history") setPhase("theater");
        else setModalOpen(false);
    };

    const getPrimaryActionLabel = () => {
        if (loading) return "Processing…";
        switch (currentPhase) {
            case "setup": return "Generate Plan";
            case "plan": return "Approve & Render";
            case "theater": return "Export / Share";
            case "history": return "Back to Result";
            default: return "Next";
        }
    };

    const getPrimaryActionIcon = () => {
        switch (currentPhase) {
            case "setup": return "magic_button";
            case "plan": return "arrow_forward";
            case "theater": return "share";
            case "history": return "arrow_forward";
            default: return "arrow_forward";
        }
    };

    // Disable the CTA when plan phase has no blueprint to approve
    const isDisabled = loading || (currentPhase === "plan" && !blueprint);

    return (
        <footer className="bg-white border-t border-gray-100 flex justify-between items-center px-8 py-4 shrink-0">
            <button
                onClick={handleBackClick}
                className="flex items-center gap-2 text-gray-500 border border-gray-200 px-6 py-2 rounded-md font-bold text-sm hover:bg-gray-50 hover:text-black transition-all"
            >
                <span className="material-symbols-outlined">arrow_back</span>
                {currentPhase === "setup" ? "Close" : "Back"}
            </button>

            <button
                onClick={handlePrimaryClick}
                disabled={isDisabled}
                className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
                {loading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-white" />
                )}
                {getPrimaryActionLabel()}
                {!loading && (
                    <span className="material-symbols-outlined text-sm">{getPrimaryActionIcon()}</span>
                )}
            </button>
        </footer>
    );
}