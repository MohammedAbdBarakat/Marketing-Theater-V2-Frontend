import { useVideoStudioStore } from "../../store/useVideoStudioStore";

export function TopBar() {
    const { currentPhase, setPhase, setModalOpen } = useVideoStudioStore();

    const tabs = [
        { id: "setup", label: "Setup" },
        { id: "plan", label: "Plan" },
        { id: "theater", label: "Result" }
    ] as const;

    return (
        <header className="bg-white border-b border-gray-100 flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50">
            <div className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span className="material-symbols-outlined pb-1">movie</span> 
                Video Studio
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
                {tabs.map(tab => {
                    const isActive = currentPhase === tab.id || (tab.id === 'theater' && currentPhase === 'history');
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setPhase(tab.id)}
                            className={`text-xs tracking-widest uppercase transition-colors duration-200 ${
                                isActive 
                                    ? "text-black border-b-2 border-black pb-1 font-bold" 
                                    : "text-gray-500 font-medium hover:text-black"
                            }`}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </nav>

            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setPhase('history')}
                    className="text-gray-500 hover:text-black transition-transform scale-95 active:opacity-80"
                    title="Version History"
                >
                    <span className="material-symbols-outlined">history</span>
                </button>
                <button 
                    onClick={() => setModalOpen(false)}
                    className="text-gray-500 hover:text-black transition-transform scale-95 active:opacity-80"
                    title="Close"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>
        </header>
    );
}
