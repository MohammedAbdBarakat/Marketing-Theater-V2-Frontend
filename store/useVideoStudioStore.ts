import { create } from "zustand";
import {
    VideoStudioPhase,
    ArchetypeOption,
    ProtagonistOption,
    VoiceoverOption,
    VideoBlueprint,
    GenerationStatus
} from "../types/videoStudio";

interface VideoStudioState {
    currentPhase: VideoStudioPhase;
    isModalOpen: boolean;

    // Context from parent (set on mount)
    assetId: string;
    runId: string;

    // Setup config
    config: {
        scene_count: number;
        aspect_ratio: string;
        archetype_id: string;
        transition_mode: string;
        voiceover_toggle: 'auto' | 'true' | 'false';
        voice_model: string;
        protagonist_id: string | null;
        custom_protagonist_desc: string;
        ref_images: Record<string, string>;
    };

    // Options loaded from API
    options: {
        archetypes: ArchetypeOption[];
        protagonists: ProtagonistOption[];
        voiceovers: VoiceoverOption[];
        loading: boolean;
    };

    // Plan data
    blueprint: VideoBlueprint | null;
    resolvedPrompt: string;

    // Generation state
    generationStatus: GenerationStatus;
    taskId: string | null;
    versionId: string | null;
    videoUrl: string | null;
    generationError: string | null;

    // Actions
    setPhase: (phase: VideoStudioPhase) => void;
    setModalOpen: (isOpen: boolean) => void;
    setContext: (assetId: string, runId: string) => void;
    updateConfig: (patch: Partial<VideoStudioState["config"]>) => void;
    setOptions: (options: Partial<VideoStudioState["options"]>) => void;

    // Plan actions
    setBlueprint: (blueprint: VideoBlueprint, resolvedPrompt?: string) => void;
    updateScenePrompt: (sceneIndex: number, newPrompt: string) => void;
    updateVoiceoverScript: (script: string) => void;

    // Generation actions
    setGenerationStatus: (status: GenerationStatus) => void;
    setTaskId: (taskId: string | null) => void;
    setVersionId: (versionId: string | null) => void;
    setVideoUrl: (url: string | null) => void;
    setGenerationError: (error: string | null) => void;

    reset: () => void;
}

const initialConfig = {
    scene_count: 4,
    aspect_ratio: "16:9",
    archetype_id: "",
    transition_mode: "auto",
    voiceover_toggle: "auto" as const,
    voice_model: "",
    protagonist_id: null as string | null,
    custom_protagonist_desc: "",
    ref_images: {} as Record<string, string>
};

export const useVideoStudioStore = create<VideoStudioState>((set) => ({
    currentPhase: "setup",
    isModalOpen: false,
    assetId: "",
    runId: "",

    config: { ...initialConfig },

    options: {
        archetypes: [],
        protagonists: [],
        voiceovers: [],
        loading: true,
    },

    blueprint: null,
    resolvedPrompt: "",

    generationStatus: "idle",
    taskId: null,
    versionId: null,
    videoUrl: null,
    generationError: null,

    setPhase: (phase) => set({ currentPhase: phase }),
    setModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
    setContext: (assetId, runId) => set({ assetId, runId }),
    updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
    setOptions: (patch) => set((state) => ({ options: { ...state.options, ...patch } })),

    // Plan actions
    setBlueprint: (blueprint, resolvedPrompt) => set({
        blueprint,
        resolvedPrompt: resolvedPrompt || ""
    }),
    updateScenePrompt: (sceneIndex, newPrompt) => set((state) => {
        if (!state.blueprint) return {};
        const updatedScenes = state.blueprint.scenes.map(s =>
            s.scene_index === sceneIndex ? { ...s, veo_prompt: newPrompt } : s
        );
        return { blueprint: { ...state.blueprint, scenes: updatedScenes } };
    }),
    updateVoiceoverScript: (script) => set((state) => {
        if (!state.blueprint) return {};
        return { blueprint: { ...state.blueprint, voiceover_script: script } };
    }),

    // Generation actions
    setGenerationStatus: (status) => set({ generationStatus: status }),
    setTaskId: (taskId) => set({ taskId }),
    setVersionId: (versionId) => set({ versionId }),
    setVideoUrl: (url) => set({ videoUrl: url }),
    setGenerationError: (error) => set({ generationError: error }),

    reset: () => set({
        currentPhase: "setup",
        config: { ...initialConfig },
        blueprint: null,
        resolvedPrompt: "",
        generationStatus: "idle",
        taskId: null,
        versionId: null,
        videoUrl: null,
        generationError: null,
    })
}));
