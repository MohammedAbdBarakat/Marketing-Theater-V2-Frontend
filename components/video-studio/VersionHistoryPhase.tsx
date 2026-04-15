import { useEffect } from "react";
import { getVideoVersionDetail, getVideoVersionHistory } from "../../lib/videoStudioApi";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import type { VideoHistorySummary } from "../../types/videoStudio";

function formatDate(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
}

function statusTone(status: VideoHistorySummary["status"]) {
    switch (status) {
        case "completed":
            return "text-green-700 bg-green-50 border-green-100";
        case "failed":
            return "text-red-700 bg-red-50 border-red-100";
        case "processing":
            return "text-amber-700 bg-amber-50 border-amber-100";
        default:
            return "text-gray-700 bg-gray-100 border-gray-200";
    }
}

export function VersionHistoryPhase() {
    const {
        assetId,
        history,
        historyLoading,
        historyError,
        selectedHistoryVersionId,
        selectedHistoryDetail,
        setHistory,
        setHistoryLoading,
        setHistoryError,
        setSelectedHistoryVersionId,
        hydrateFromHistoryDetail,
        setPhase,
    } = useVideoStudioStore();

    useEffect(() => {
        let active = true;

        async function loadHistory() {
            if (!assetId) return;
            setHistoryLoading(true);
            try {
                const items = await getVideoVersionHistory(assetId);
                if (!active) return;
                setHistory(items);
                setHistoryError(null);

                const targetId = selectedHistoryVersionId || items.find((item) => item.is_active_version)?.video_version_id || items[0]?.video_version_id;
                if (targetId) {
                    const detail = await getVideoVersionDetail(assetId, targetId);
                    if (!active) return;
                    hydrateFromHistoryDetail(detail);
                }
            } catch (error) {
                if (!active) return;
                console.error("Failed to load video history", error);
                setHistoryError("Could not load video version history.");
            } finally {
                if (active) setHistoryLoading(false);
            }
        }

        loadHistory();

        return () => {
            active = false;
        };
    }, [assetId, selectedHistoryVersionId, setHistory, setHistoryError, setHistoryLoading, hydrateFromHistoryDetail]);

    const handleSelect = async (videoVersionId: string) => {
        setSelectedHistoryVersionId(videoVersionId);
        try {
            const detail = await getVideoVersionDetail(assetId, videoVersionId);
            hydrateFromHistoryDetail(detail);
            setHistoryError(null);
        } catch (error) {
            console.error("Failed to load selected video version", error);
            setHistoryError("Could not load the selected version.");
        }
    };

    const handleOpenPlan = async (videoVersionId: string) => {
        try {
            const detail = await getVideoVersionDetail(assetId, videoVersionId);
            hydrateFromHistoryDetail(detail);
            setPhase("plan");
        } catch (error) {
            console.error("Failed to open historical plan", error);
            setHistoryError("Could not open this version in Plan.");
        }
    };

    const selectedSummary = history.find((item) => item.video_version_id === selectedHistoryVersionId) || history[0] || null;

    return (
        <div className="flex-grow overflow-y-auto px-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto py-8 pb-20 space-y-8">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                    <p className="text-xs text-gray-400">Browse previous video renders and reopen any saved plan.</p>
                </div>

                {historyError && (
                    <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {historyError}
                    </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                    <div className="aspect-video bg-black relative">
                        {historyLoading ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white" />
                                <p className="text-sm font-medium">Loading version history…</p>
                            </div>
                        ) : selectedHistoryDetail?.video_url ? (
                            <video
                                key={selectedHistoryDetail.video_version_id}
                                src={selectedHistoryDetail.video_url}
                                controls
                                className="w-full h-full object-contain bg-black"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-300">
                                <span className="material-symbols-outlined text-5xl">movie</span>
                                <div className="text-center">
                                    <p className="text-sm font-semibold text-white/90">
                                        {selectedSummary?.status === "failed" ? "This version failed to render" : "No rendered video for this version yet"}
                                    </p>
                                    <p className="text-xs text-white/50 mt-1">
                                        {selectedHistoryDetail?.error_message || "Select another completed version to preview it here."}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 bg-gray-50">
                        <div className="flex flex-wrap gap-2">
                            {selectedSummary && (
                                <>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${statusTone(selectedSummary.status)}`}>
                                        {selectedSummary.status}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                        {selectedSummary.scene_count} scenes
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                        {selectedSummary.aspect_ratio}
                                    </span>
                                    {selectedSummary.voiceover_enabled && (
                                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                            Voiceover
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        {selectedSummary && (
                            <button
                                onClick={() => handleOpenPlan(selectedSummary.video_version_id)}
                                className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-black hover:bg-gray-100 transition-colors"
                                title="Open plan for this version"
                            >
                                <span className="material-symbols-outlined text-[18px]">article</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Saved Versions</h3>
                    {history.length === 0 && !historyLoading ? (
                        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
                            No video versions yet. Generate a video to start building history.
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {history.map((item) => {
                                const isSelected = item.video_version_id === (selectedHistoryVersionId || selectedHistoryDetail?.video_version_id);
                                return (
                                    <button
                                        key={item.video_version_id}
                                        type="button"
                                        onClick={() => handleSelect(item.video_version_id)}
                                        className={`overflow-hidden rounded-2xl border text-left transition-all ${isSelected ? "border-black shadow-md" : "border-gray-200 hover:border-gray-300 hover:shadow-sm"}`}
                                    >
                                        <div className="aspect-video bg-gray-100 relative">
                                            {item.video_url ? (
                                                <video
                                                    src={item.video_url}
                                                    muted
                                                    preload="metadata"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                                                    <span className="material-symbols-outlined text-4xl">movie</span>
                                                </div>
                                            )}
                                            {item.is_active_version && (
                                                <div className="absolute top-3 left-3 rounded-full bg-black text-white px-3 py-1 text-[9px] font-bold uppercase tracking-wider">
                                                    Active
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{formatDate(item.created_at)}</p>
                                                    <p className="text-xs text-gray-400">{item.video_version_id.slice(0, 8)}</p>
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[9px] font-bold uppercase tracking-wider ${statusTone(item.status)}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                                    {item.scene_count} scenes
                                                </span>
                                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                                    {item.aspect_ratio}
                                                </span>
                                                {item.voiceover_enabled && (
                                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                                        Voice
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
