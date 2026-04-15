export type VideoStudioPhase = "setup" | "plan" | "theater" | "history";

export interface ArchetypeConfig {
    id: string;
}

export interface VoiceoverConfig {
    voice_model: string;
    voice_toggle: 'auto' | 'true' | 'false';
}

export interface RefImage {
    id: string;
    url: string;
}

export interface ProtagonistConfig {
    prototype_id: string;
    custom_description?: string;
}

// API Contracts
export interface VideoPlanRequest {
    scene_count: number;
    aspect_ratio: string;
    archetype: ArchetypeConfig;
    transition_mode: string;
    voiceover: VoiceoverConfig;
    ref_images?: RefImage[];
    protagonist?: ProtagonistConfig;
}

export interface VideoVersionInput {
    scene_count: number;
    aspect_ratio: string;
    transition_mode: string;
    archetype: { name: string };
    protagonist?: { text: string; type: string } | null;
    voiceover: { voice_name?: string; voice_toggle: 'auto' | 'true' | 'false' };
    ref_images: { tag: string; image: string }[];
}

// Option Types from API
export interface ArchetypeOption {
    id: string;
    name: string;
    description: string;
}

export interface ProtagonistOption {
    id: string;
    label: string;
    description: string;
}

export interface VoiceoverOption {
    id: string;
    name: string;
    style: string;
    gender: string;
    age_indicator: string;
}

// Blueprint types (from API contract)
export interface BlueprintScene {
    scene_index: number;
    role: string;
    veo_prompt: string;
    transition_method: string;
    reference_tags_used: string[];
}

export interface VideoBlueprint {
    director_note?: string;
    scenes: BlueprintScene[];
    needs_voiceover: boolean;
    voiceover_script: string;
    alignment_reasoning?: string;
    aspect_ratio: string;
    transition_mode: string;
    ad_archetype: string;
    protagonist_profile: {
        description: string;
        type: string;
    };
    ref_images: { tag: string; image: string }[];
}

// Response from POST /api/assets/{asset_id}/plan-video
export interface PlanVideoResponse {
    message: string;
    asset_id: string;
    blueprint: VideoBlueprint;
    resolved_prompt: string;
}

// Response from POST /api/assets/{asset_id}/generate-video
export interface GenerateVideoResponse {
    message: string;
    asset_id: string;
    video_version_id: string;
    version_id?: string;
    task_id: string;
}

export interface VideoHistorySummary {
    asset_id: string;
    video_version_id: string;
    created_at: string;
    status: "planned" | "processing" | "completed" | "failed";
    is_active_version: boolean;
    scene_count: number;
    aspect_ratio: string;
    archetype?: string | null;
    voiceover_enabled: boolean;
    voice_name?: string | null;
    video_url?: string | null;
    error_message?: string | null;
}

export interface VideoHistoryDetail extends VideoHistorySummary {
    render_metadata?: Record<string, any>;
    version_input: VideoVersionInput;
    blueprint: VideoBlueprint;
}

export type GenerationStatus = 'idle' | 'generating_plan' | 'generating_video' | 'completed' | 'failed';
