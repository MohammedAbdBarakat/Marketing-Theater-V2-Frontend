import { useEffect } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { SetupPhase } from "./SetupPhase";
import { PlanApprovalPhase } from "./PlanApprovalPhase";
import { TheaterPhase } from "./TheaterPhase";
import { VersionHistoryPhase } from "./VersionHistoryPhase";
import { getVideoVersionDetail, getVideoVersionHistory } from "../../lib/videoStudioApi";

interface VideoStudioModalProps {
    assetId: string;
    projectId: string;
    runId: string;
    initialContext: { title: string; channel: string; type: string; date?: string };
    onClose: () => void;
}

export function VideoStudioModal({ assetId, projectId, runId, initialContext, onClose }: VideoStudioModalProps) {
    const {
        currentPhase,
        isModalOpen,
        setModalOpen,
        setContext,
        reset,
        setHistory,
        setHistoryLoading,
        setHistoryError,
        hydrateFromHistoryDetail,
    } = useVideoStudioStore();

    useEffect(() => {
        let active = true;
        setModalOpen(true);
        setContext(assetId, runId);

        async function hydrateHistory() {
            setHistoryLoading(true);
            setHistoryError(null);
            try {
                const history = await getVideoVersionHistory(assetId);
                if (!active) return;
                setHistory(history);

                const initialVersion = history.find((item) => item.is_active_version) || history[0];
                if (initialVersion) {
                    const detail = await getVideoVersionDetail(assetId, initialVersion.video_version_id);
                    if (!active) return;
                    hydrateFromHistoryDetail(detail);
                }
            } catch (error) {
                if (!active) return;
                console.error("Failed to hydrate video history", error);
                setHistoryError("Could not load video history.");
            } finally {
                if (active) setHistoryLoading(false);
            }
        }

        hydrateHistory();

        return () => {
            active = false;
            setModalOpen(false);
            reset();
        };
    }, [
        setModalOpen,
        setContext,
        reset,
        assetId,
        runId,
        setHistory,
        setHistoryLoading,
        setHistoryError,
        hydrateFromHistoryDetail,
    ]);

    const handleClose = () => {
        setModalOpen(false);
        reset();
        onClose();
    };

    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200">
                <TopBar />
                
                {/* Phase Routing */}
                {currentPhase === "setup" && <SetupPhase projectId={projectId} runId={runId} />}
                {currentPhase === "plan" && <PlanApprovalPhase />}
                {currentPhase === "theater" && <TheaterPhase />}
                {currentPhase === "history" && <VersionHistoryPhase />}
                
                <BottomNav />
            </div>
        </div>
    );
}
