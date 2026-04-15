import { create } from "zustand";
import {
    VideoStudioPhase,
    ArchetypeOption,
    ProtagonistOption,
    VoiceoverOption,
    VideoBlueprint,
    GenerationStatus,
    VideoHistorySummary,
    VideoHistoryDetail,
} from "../types/videoStudio";

interface VideoStudioState {
    currentPhase: VideoStudioPhase;
    isModalOpen: boolean;

    assetId: string;
    runId: string;

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

    options: {
        archetypes: ArchetypeOption[];
        protagonists: ProtagonistOption[];
        voiceovers: VoiceoverOption[];
        loading: boolean;
    };

    blueprint: VideoBlueprint | null;
    resolvedPrompt: string;

    generationStatus: GenerationStatus;
    taskId: string | null;
    versionId: string | null;
    videoUrl: string | null;
    generationError: string | null;

    history: VideoHistorySummary[];
    historyLoading: boolean;
    historyError: string | null;
    selectedHistoryVersionId: string | null;
    selectedHistoryDetail: VideoHistoryDetail | null;

    setPhase: (phase: VideoStudioPhase) => void;
    setModalOpen: (isOpen: boolean) => void;
    setContext: (assetId: string, runId: string) => void;
    updateConfig: (patch: Partial<VideoStudioState["config"]>) => void;
    setOptions: (options: Partial<VideoStudioState["options"]>) => void;

    setBlueprint: (blueprint: VideoBlueprint, resolvedPrompt?: string) => void;
    updateScenePrompt: (sceneIndex: number, newPrompt: string) => void;
    updateVoiceoverScript: (script: string) => void;

    setGenerationStatus: (status: GenerationStatus) => void;
    setTaskId: (taskId: string | null) => void;
    setVersionId: (versionId: string | null) => void;
    setVideoUrl: (url: string | null) => void;
    setGenerationError: (error: string | null) => void;

    setHistory: (history: VideoHistorySummary[]) => void;
    setHistoryLoading: (loading: boolean) => void;
    setHistoryError: (error: string | null) => void;
    setSelectedHistoryVersionId: (versionId: string | null) => void;
    hydrateFromHistoryDetail: (detail: VideoHistoryDetail) => void;
    updateHistoryEntry: (videoVersionId: string, patch: Partial<VideoHistorySummary>) => void;

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
    ref_images: {} as Record<string, string>,
};

function statusFromDetail(detail: VideoHistoryDetail): GenerationStatus {
    if (detail.status === "completed" && detail.video_url) return "completed";
    if (detail.status === "failed") return "failed";
    if (detail.status === "processing") return "generating_video";
    return "idle";
}

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

    history: [],
    historyLoading: false,
    historyError: null,
    selectedHistoryVersionId: null,
    selectedHistoryDetail: null,

    setPhase: (phase) => set({ currentPhase: phase }),
    setModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
    setContext: (assetId, runId) => set({ assetId, runId }),
    updateConfig: (patch) => set((state) => ({ config: { ...state.config, ...patch } })),
    setOptions: (patch) => set((state) => ({ options: { ...state.options, ...patch } })),

    setBlueprint: (blueprint, resolvedPrompt) => set({
        blueprint,
        resolvedPrompt: resolvedPrompt || "",
    }),
    updateScenePrompt: (sceneIndex, newPrompt) => set((state) => {
        if (!state.blueprint) return {};
        const updatedScenes = state.blueprint.scenes.map((scene) =>
            scene.scene_index === sceneIndex ? { ...scene, veo_prompt: newPrompt } : scene
        );
        return { blueprint: { ...state.blueprint, scenes: updatedScenes } };
    }),
    updateVoiceoverScript: (script) => set((state) => {
        if (!state.blueprint) return {};
        return { blueprint: { ...state.blueprint, voiceover_script: script } };
    }),

    setGenerationStatus: (status) => set({ generationStatus: status }),
    setTaskId: (taskId) => set({ taskId }),
    setVersionId: (versionId) => set({ versionId }),
    setVideoUrl: (url) => set({ videoUrl: url }),
    setGenerationError: (error) => set({ generationError: error }),

    setHistory: (history) => set({ history }),
    setHistoryLoading: (loading) => set({ historyLoading: loading }),
    setHistoryError: (error) => set({ historyError: error }),
    setSelectedHistoryVersionId: (versionId) => set({ selectedHistoryVersionId: versionId }),
    hydrateFromHistoryDetail: (detail) => set((state) => {
        const nextConfig = {
            ...state.config,
            scene_count: detail.version_input.scene_count,
            aspect_ratio: detail.version_input.aspect_ratio,
            transition_mode: detail.version_input.transition_mode,
            archetype_id: detail.version_input.archetype?.name || state.config.archetype_id,
            voiceover_toggle: detail.version_input.voiceover?.voice_toggle || state.config.voiceover_toggle,
            voice_model: detail.version_input.voiceover?.voice_name || state.config.voice_model,
            protagonist_id: detail.version_input.protagonist?.type || state.config.protagonist_id,
            custom_protagonist_desc: detail.version_input.protagonist?.text || "",
            ref_images: Object.fromEntries(
                (detail.version_input.ref_images || []).map((item) => [item.tag, item.image])
            ),
        };

        const nextHistory = state.history.some((item) => item.video_version_id === detail.video_version_id)
            ? state.history.map((item) => item.video_version_id === detail.video_version_id ? { ...item, ...detail } : item)
            : [detail, ...state.history];

        return {
            config: nextConfig,
            blueprint: detail.blueprint,
            generationStatus: statusFromDetail(detail),
            versionId: detail.video_version_id,
            videoUrl: detail.video_url || null,
            generationError: detail.error_message || null,
            selectedHistoryVersionId: detail.video_version_id,
            selectedHistoryDetail: detail,
            history: nextHistory,
        };
    }),
    updateHistoryEntry: (videoVersionId, patch) => set((state) => ({
        history: state.history.map((item) =>
            item.video_version_id === videoVersionId ? { ...item, ...patch } : item
        ),
        selectedHistoryDetail: state.selectedHistoryDetail?.video_version_id === videoVersionId
            ? { ...state.selectedHistoryDetail, ...patch }
            : state.selectedHistoryDetail,
    })),

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
        history: [],
        historyLoading: false,
        historyError: null,
        selectedHistoryVersionId: null,
        selectedHistoryDetail: null,
    }),
}));
