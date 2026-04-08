import { useEffect } from "react";
import { useVideoStudioStore } from "../../store/useVideoStudioStore";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { SetupPhase } from "./SetupPhase";
import { PlanApprovalPhase } from "./PlanApprovalPhase";
import { TheaterPhase } from "./TheaterPhase";
import { VersionHistoryPhase } from "./VersionHistoryPhase";

interface VideoStudioModalProps {
    assetId: string;
    projectId: string;
    runId: string;
    initialContext: { title: string; channel: string; type: string; date?: string };
    onClose: () => void;
}

export function VideoStudioModal({ assetId, projectId, runId, initialContext, onClose }: VideoStudioModalProps) {
    const { currentPhase, isModalOpen, setModalOpen, setContext, reset } = useVideoStudioStore();

    useEffect(() => {
        setModalOpen(true);
        setContext(assetId, runId);
        return () => {
            setModalOpen(false);
            reset();
        };
    }, [setModalOpen, setContext, reset, assetId, runId]);

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
