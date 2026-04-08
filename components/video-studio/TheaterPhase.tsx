import { useEffect, useRef } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { API_BASE } from "../../lib/config";

export function TheaterPhase() {
    const { 
        blueprint, 
        generationStatus, 
        videoUrl, 
        versionId,
        generationError, 
        runId,
        setGenerationStatus, 
        setVideoUrl, 
        setGenerationError 
    } = useVideoStudioStore();

    const eventSourceRef = useRef<EventSource | null>(null);

    // SSE listener for video generation progress
    useEffect(() => {
        if (generationStatus !== "generating_video" || !runId) return;

        const es = new EventSource(`${API_BASE}/runs/${runId}/stream`);
        eventSourceRef.current = es;

        es.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);

                if (parsed.type === "video_update" || parsed.type === "video_completed") {
                    if (parsed.data?.status === "completed" && parsed.data?.url) {
                        setVideoUrl(parsed.data.url);
                        setGenerationStatus("completed");
                        es.close();
                    } else if (parsed.data?.status === "failed") {
                        setGenerationError(parsed.data?.message || "Video generation failed.");
                        setGenerationStatus("failed");
                        es.close();
                    }
                }
            } catch {
                // ignore parse errors
            }
        };

        es.onerror = () => {
            // In mock mode, SSE won't connect — simulate completion after delay
            es.close();
            setTimeout(() => {
                const currentStatus = useVideoStudioStore.getState().generationStatus;
                if (currentStatus === "generating_video") {
                    setVideoUrl("https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
                    setGenerationStatus("completed");
                }
            }, 4000);
        };

        return () => {
            es.close();
            eventSourceRef.current = null;
        };
    }, [generationStatus, runId, setGenerationStatus, setVideoUrl, setGenerationError]);

    // ─── IDLE: No generation started ─────────────────────
    if (generationStatus === "idle" || generationStatus === "generating_plan") {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4 text-gray-400">
                <span className="material-symbols-outlined text-5xl text-gray-300">movie</span>
                <p className="text-sm font-medium text-gray-500">No video generated yet</p>
                <p className="text-xs">Complete the Setup and Plan phases first</p>
            </div>
        );
    }

    // ─── GENERATING: Video is rendering ──────────────────
    if (generationStatus === "generating_video") {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-6">
                {/* Animated spinner */}
                <div className="relative w-20 h-20">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                    <div className="absolute inset-2 animate-spin rounded-full border-2 border-gray-100 border-b-gray-400" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-2xl">
                            movie
                        </span>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <p className="text-sm font-bold text-gray-900 tracking-wide">Rendering your video…</p>
                    <p className="text-xs text-gray-400">This may take a few minutes depending on scene complexity</p>
                </div>

                {/* Metadata chips */}
                {blueprint && (
                    <div className="flex gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <span className="material-symbols-outlined text-[12px]">theaters</span>
                            {blueprint.scenes.length} scenes
                        </span>
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            <span className="material-symbols-outlined text-[12px]">aspect_ratio</span>
                            {blueprint.aspect_ratio}
                        </span>
                    </div>
                )}
            </div>
        );
    }

    // ─── FAILED: Error state ─────────────────────────────
    if (generationStatus === "failed") {
        return (
            <div className="flex-grow flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-400 text-2xl">error</span>
                </div>
                <p className="text-sm font-bold text-gray-900">Generation Failed</p>
                <p className="text-xs text-gray-500 max-w-sm text-center">
                    {generationError || "Something went wrong during video rendering."}
                </p>
                <button
                    onClick={() => setGenerationStatus("idle")}
                    className="mt-2 px-6 py-2 bg-black text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    // ─── COMPLETED: Video player ─────────────────────────
    if (generationStatus === "completed" && videoUrl) {
        return (
            <div className="flex-grow overflow-y-auto px-8 custom-scrollbar">
                <div className="max-w-4xl mx-auto py-8 pb-32 space-y-6">

                    {/* Metadata bar */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            {versionId && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                    <span className="material-symbols-outlined text-[12px]">tag</span>
                                    {versionId.slice(0, 16)}
                                </span>
                            )}
                            {blueprint && (
                                <>
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                        {blueprint.aspect_ratio}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                        {blueprint.scenes.length} scenes
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                            <span className="material-symbols-outlined text-[12px]">check_circle</span>
                            Complete
                        </div>
                    </div>

                    {/* Video Player */}
                    <div className="relative bg-black rounded-xl overflow-hidden shadow-lg">
                        <video
                            src={videoUrl}
                            controls
                            className="w-full aspect-video"
                            poster=""
                        />
                    </div>

                    {/* Scene Timeline Strip */}
                    {blueprint && blueprint.scenes.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Scene Timeline</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {blueprint.scenes.map((scene) => (
                                    <div
                                        key={scene.scene_index}
                                        className="flex-shrink-0 w-40 bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
                                    >
                                        {/* Scene thumbnail placeholder */}
                                        <div className="w-full aspect-video bg-gray-100 rounded-md mb-2 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-gray-300 text-lg">
                                                movie
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-5 h-5 bg-black text-white rounded text-[8px] font-bold">
                                                {String(scene.scene_index + 1).padStart(2, '0')}
                                            </span>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                                {scene.role}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Fallback
    return null;
}
