import { useEffect, useRef, useCallback } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { getVideoVersionHistory } from "../../lib/videoStudioApi";
import { API_BASE } from "../../lib/config";

export function TheaterPhase() {
    const {
        blueprint,
        generationStatus,
        videoUrl,
        versionId,
        generationError,
        runId,
        taskId,
        assetId,
        setGenerationStatus,
        setVideoUrl,
        setGenerationError,
        updateHistoryEntry,
        setPhase
    } = useVideoStudioStore();

    const eventSourceRef = useRef<EventSource | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Stable callback to handle a completed/failed event
    const handleCompletedEvent = useCallback((url: string, currentVersionId: string | null) => {
        setVideoUrl(url);
        setGenerationStatus("completed");
        if (currentVersionId) {
            updateHistoryEntry(currentVersionId, { status: "completed", video_url: url, error_message: null });
        }
    }, [setVideoUrl, setGenerationStatus, updateHistoryEntry]);

    const handleFailedEvent = useCallback((message: string, currentVersionId: string | null) => {
        setGenerationError(message);
        setGenerationStatus("failed");
        if (currentVersionId) {
            updateHistoryEntry(currentVersionId, { status: "failed", error_message: message });
        }
    }, [setGenerationError, setGenerationStatus, updateHistoryEntry]);

    // ─── SSE listener with auto-reconnect ─────────────────
    useEffect(() => {
        if (generationStatus !== "generating_video" || !runId) return;

        let isCancelled = false;

        const connectSSE = () => {
            if (isCancelled) return;

            // Close existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            const es = new EventSource(`${API_BASE}/runs/${runId}/stream`);
            eventSourceRef.current = es;

            es.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    if (parsed.type !== "asset_update" || !parsed.data) return;

                    const data = parsed.data;

                    // Get current versionId from store (closure might be stale,
                    // so we also accept if our versionId is null = "accept any")
                    const currentVersionId = useVideoStudioStore.getState().versionId;
                    if (currentVersionId && data.version_id !== currentVersionId) return;

                    if (data.status === "completed" && data.url) {
                        handleCompletedEvent(data.url, currentVersionId);
                        es.close();
                        eventSourceRef.current = null;
                    } else if (data.status === "failed") {
                        handleFailedEvent(
                            data.message || data.error || "Video generation failed.",
                            currentVersionId
                        );
                        es.close();
                        eventSourceRef.current = null;
                    }
                } catch {
                    // ignore parse errors
                }
            };

            es.onerror = () => {
                if (isCancelled) return;
                console.warn("Video stream connection interrupted, will reconnect...", { runId, versionId, taskId });
                es.close();
                eventSourceRef.current = null;

                // Auto-reconnect after 2 seconds
                reconnectTimeoutRef.current = setTimeout(() => {
                    const currentStatus = useVideoStudioStore.getState().generationStatus;
                    if (!isCancelled && currentStatus === "generating_video") {
                        console.log("Reconnecting SSE...");
                        connectSSE();
                    }
                }, 2000);
            };
        };

        connectSSE();

        return () => {
            isCancelled = true;
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    // We intentionally exclude versionId from deps to avoid reconnect cycles.
    // The handler reads the latest versionId from the store directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [generationStatus, runId]);

    // ─── Polling fallback for missed SSE events ──────────
    useEffect(() => {
        if (generationStatus !== "generating_video" || !assetId || !versionId) return;

        // Poll every 5 seconds as a safety net
        pollIntervalRef.current = setInterval(async () => {
            try {
                const currentStatus = useVideoStudioStore.getState().generationStatus;
                if (currentStatus !== "generating_video") {
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                    return;
                }

                const history = await getVideoVersionHistory(assetId);
                const currentVersionId = useVideoStudioStore.getState().versionId;
                const match = history.find(v => v.video_version_id === currentVersionId);

                if (match && match.status === "completed" && match.video_url) {
                    console.log("Polling fallback: detected completed version", match.video_version_id);
                    handleCompletedEvent(match.video_url, currentVersionId);
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                } else if (match && match.status === "failed") {
                    console.log("Polling fallback: detected failed version", match.video_version_id);
                    handleFailedEvent(
                        match.error_message || "Video generation failed.",
                        currentVersionId
                    );
                    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                }
            } catch (err) {
                console.warn("Polling fallback error:", err);
            }
        }, 5000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
    }, [generationStatus, assetId, versionId, handleCompletedEvent, handleFailedEvent]);

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
                        {blueprint.aspect_ratio && (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                {blueprint.aspect_ratio}
                            </span>
                        )}
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
                    onClick={() => {
                        setGenerationStatus("idle"); // Clears the error so BottomNav button re-enables
                        setPhase("plan");            // Routes back to the Approve tab
                    }}
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
                    {false && blueprint && (blueprint?.scenes?.length ?? 0) > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Scene Timeline</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {blueprint?.scenes.map((scene) => (
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
