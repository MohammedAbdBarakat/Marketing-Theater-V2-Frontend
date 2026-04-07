export type VideoStudioPhase = "setup" | "plan" | "theater" | "history";

export interface ArchetypeConfig {
    id: string;
}

export interface VoiceoverConfig {
    voice_model: string;
    enabled: boolean;
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
