import { create } from "zustand";
import { 
    VideoStudioPhase, 
    VideoPlanRequest, 
    ArchetypeOption, 
    ProtagonistOption, 
    VoiceoverOption 
} from "../types/videoStudio";

interface VideoStudioState {
    currentPhase: VideoStudioPhase;
    isModalOpen: boolean;

    // Selected Data
    config: {
        scene_count: number;
        aspect_ratio: string;
        archetype_id: string;
        transition_mode: string;
        voiceover_enabled: boolean;
        voice_model: string;
        protagonist_id: string | null;
        custom_protagonist_desc: string;
    };

    // Options loaded from API
    options: {
        archetypes: ArchetypeOption[];
        protagonists: ProtagonistOption[];
        voiceovers: VoiceoverOption[];
        loading: boolean;
    };

    // Actions
    setPhase: (phase: VideoStudioPhase) => void;
    setModalOpen: (isOpen: boolean) => void;
    updateConfig: (patch: Partial<VideoStudioState["config"]>) => void;
    setOptions: (options: Partial<VideoStudioState["options"]>) => void;
    reset: () => void;
}

export const useVideoStudioStore = create<VideoStudioState>((set) => ({
    currentPhase: "setup",
    isModalOpen: false,

    config: {
        scene_count: 4,
        aspect_ratio: "16:9",
        archetype_id: "",
        transition_mode: "auto",
        voiceover_enabled: false,
        voice_model: "",
        protagonist_id: null,
        custom_protagonist_desc: ""
    },

    options: {
        archetypes: [],
        protagonists: [],
        voiceovers: [],
        loading: true,
    },

    setPhase: (phase) => set({ currentPhase: phase }),
    setModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
    updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
    setOptions: (patch) => set((state) => ({ options: { ...state.options, ...patch } })),
    
    reset: () => set({
        currentPhase: "setup",
        config: {
            scene_count: 4,
            aspect_ratio: "16:9",
            archetype_id: "",
            transition_mode: "auto",
            voiceover_enabled: false,
            voice_model: "",
            protagonist_id: null,
            custom_protagonist_desc: ""
        }
    })
}));
