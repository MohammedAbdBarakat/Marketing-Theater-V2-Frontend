import { useVideoStudioStore } from "../../store/useVideoStudioStore";

export function BottomNav() {
    const { currentPhase, setPhase, setModalOpen } = useVideoStudioStore();

    const handlePrimaryClick = () => {
        if (currentPhase === "setup") {
            // Mock API submission later
            setPhase("plan");
        } else if (currentPhase === "plan") {
            // Mock API submission later
            setPhase("theater");
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
        switch (currentPhase) {
            case "setup": return "Generate Plan";
            case "plan": return "Approve & Lock Plan";
            case "theater": return "Export/Share";
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

    return (
        <footer className="fixed bottom-0 left-0 w-full z-50 flex justify-between items-center px-8 py-6 bg-white border-t border-gray-100 shadow-sm">
            <button 
                onClick={handleBackClick}
                className="flex items-center gap-2 text-gray-500 border border-gray-200 px-6 py-2 rounded-md font-bold text-sm hover:bg-gray-50 hover:text-black transition-all"
            >
                <span className="material-symbols-outlined">arrow_back</span>
                {currentPhase === "setup" ? "Close" : "Back"}
            </button>
            
            <button 
                onClick={handlePrimaryClick}
                className="flex items-center gap-2 bg-black text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-gray-800 transition-all active:scale-95 shadow-md"
            >
                {getPrimaryActionLabel()}
                <span className="material-symbols-outlined text-sm">{getPrimaryActionIcon()}</span>
            </button>
        </footer>
    );
}
