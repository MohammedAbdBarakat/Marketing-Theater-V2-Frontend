import { http } from "./http";
import { IS_REMOTE } from "./config";
import {
    ArchetypeOption,
    ProtagonistOption,
    VoiceoverOption,
    PlanVideoResponse,
    GenerateVideoResponse,
    VideoBlueprint,
    VideoVersionInput,
    VideoHistorySummary,
    VideoHistoryDetail
} from "../types/videoStudio";

export async function fetchArchetypes(): Promise<ArchetypeOption[]> {
    if (IS_REMOTE) {
        try {
            const data = await http<{ archetypes: ArchetypeOption[] }>('/api/video-options/archetypes');
            if (data.archetypes) return data.archetypes;
        } catch (e) {
            console.warn("Failed to fetch archetypes", e);
        }
    }

    return new Promise(resolve => setTimeout(() => resolve([
        { "id": "human_payoff", "name": "Human Payoff", "description": "Best for physical services, rentals, or emotional storytelling." },
        { "id": "kinetic_hype", "name": "Kinetic Hype", "description": "Best for sports, fast cars, or high-energy tech (Nike style)." },
        { "id": "minimal_premium", "name": "Minimal Premium", "description": "Best for luxury products, high-end design, or quiet confidence (Apple/Tesla style)." },
        { "id": "digital_workspace", "name": "Digital Workspace", "description": "Best for SaaS, digital agencies, or B2B tech." },
        { "id": "abstract_metaphor", "name": "Abstract Metaphor", "description": "Best for invisible services like cybersecurity or finance." },
        { "id": "storytelling_narrative", "name": "Storytelling Narrative", "description": "Best for brand origin stories, testimonials, and emotional marketing." },
        { "id": "product_showcase", "name": "Product Showcase", "description": "Best for e-commerce, unboxing, product launches, and retail." },
        { "id": "social_proof", "name": "Social Proof", "description": "Best for UGC-style content, reviews, community highlights, and authentic marketing." },
        { "id": "event_highlight", "name": "Event Highlight", "description": "Best for conferences, product launches, live events, and celebrations." },
        { "id": "educational_explainer", "name": "Educational Explainer", "description": "Best for how-to content, tutorials, B2B demos, and informational videos." }
    ]), 500));
}

export async function fetchProtagonists(): Promise<ProtagonistOption[]> {
    if (IS_REMOTE) {
        try {
            const data = await http<{ prototypes: ProtagonistOption[] }>('/api/video-options/protagonists');
            if (data.prototypes) return data.prototypes;
        } catch (e) {
            console.warn("Failed to fetch protagonists", e);
        }
    }

    return new Promise(resolve => setTimeout(() => resolve([
        { "id": "tech_savvy_millennial", "label": "Tech-Savvy Millennial", "description": "A man in his late 20s or early 30s, dressed in smart-casual attire. He appears confident, composed, and tech-savvy." },
        { "id": "sophisticated_professional", "label": "Sophisticated Professional", "description": "A sophisticated woman in a sleek black dress or tailored suit, radiating elegance and authority." },
        { "id": "energetic_creator", "label": "Energetic Creator", "description": "A vibrant, expressive person in their 20s wearing trendy streetwear, carrying a modern camera or smartphone." },
        { "id": "relatable_parent", "label": "Relatable Parent", "description": "A warm, approachable person in their 30s or 40s wearing comfortable, casual clothing, showing a caring and busy demeanor." }
    ]), 500));
}

export async function fetchVoiceovers(): Promise<VoiceoverOption[]> {
    if (IS_REMOTE) {
        try {
            const data = await http<any>('/api/video-options/voiceovers');
            if (data && Array.isArray(data.voiceovers)) {
                return data.voiceovers;
            }
        } catch (e) {
            console.warn("Failed to fetch voiceovers", e);
        }
    }

    return new Promise(resolve => setTimeout(() => resolve([
        { id: "zephyr", name: "Zephyr", style: "Bright", gender: "Female", age_indicator: "Adult" },
        { id: "puck", name: "Puck", style: "Upbeat", gender: "Male", age_indicator: "Young Adult" }
    ]), 500));
}

// ─── Plan Video ──────────────────────────────────────────
export async function planVideo(assetId: string, payload: {
    scene_count: number;
    aspect_ratio: string;
    transition_mode: string;
    archetype: { name: string };
    protagonist: { text: string; type: string };
    voiceover: { voice_name: string; voice_toggle: 'auto' | 'true' | 'false' };
    ref_images: { tag: string; image: string }[];
}): Promise<PlanVideoResponse> {
    if (IS_REMOTE) {
        return http<PlanVideoResponse>(`/api/assets/${assetId}/plan-video`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    // Mock: generate a realistic blueprint
    return new Promise(resolve => setTimeout(() => {
        // Evaluate if voiceover should be active based on the new valid strings
        const isVoiceoverActive = payload.voiceover.voice_toggle === "true" || payload.voiceover.voice_toggle === "auto";
        const scenes = Array.from({ length: payload.scene_count }).map((_, i) => ({
            scene_index: i,
            role: i === 0 ? "hook" : i === payload.scene_count - 1 ? "cta" : "body",
            veo_prompt: i === 0
                ? `Cinematic wide-angle tracking shot. A figure steps into frame against a vast, minimalist backdrop. Dramatic lighting with long shadows. The camera dollies forward slowly. 8K, anamorphic lens.`
                : i === payload.scene_count - 1
                    ? `Final scene. The product/logo is revealed in an elegant composition. Camera slowly pulls back. Warm, inviting light. Clean typography overlay space.`
                    : `Mid-shot, scene ${i + 1}. Dynamic composition showcasing the key value proposition. Subtle camera movement, shallow depth of field. Professional color grading.`,
            transition_method: payload.transition_mode === "auto" ? (i % 2 === 0 ? "morph" : "extend") : payload.transition_mode,
            reference_tags_used: i === 0 ? ["product"] : []
        }));

        const blueprint: VideoBlueprint = {
            scenes,
            needs_voiceover: isVoiceoverActive, // Updated check
            voiceover_script: isVoiceoverActive // Updated check
                ? "The horizon is no longer a limit. It is an invitation. Within the obsidian lens, we find the clarity of the unseen. Every frame tells a story — yours."
                : "",
            aspect_ratio: payload.aspect_ratio,
            transition_mode: payload.transition_mode,
            ad_archetype: payload.archetype.name,
            protagonist_profile: {
                description: payload.protagonist.text,
                type: payload.protagonist.type
            },
            ref_images: payload.ref_images
        };

        resolve({
            message: "Video Plan generated successfully",
            asset_id: assetId,
            blueprint,
            resolved_prompt: "V2 Video Plan Generated"
        });
    }, 2000));
}

// ─── Generate Video ──────────────────────────────────────
export async function generateVideo(assetId: string, payload: {
    blueprint: VideoBlueprint;
    version_input: VideoVersionInput;
}): Promise<GenerateVideoResponse> {
    if (IS_REMOTE) {
        return http<GenerateVideoResponse>(`/api/assets/${assetId}/generate-video`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    // Mock: return task info
    return new Promise(resolve => setTimeout(() => {
        resolve({
            message: "Video rendering started",
            asset_id: assetId,
            video_version_id: `ver_mock_${Date.now()}`,
            task_id: `task_mock_${Date.now()}`
        });
    }, 1000));
}

export async function getVideoVersionHistory(assetId: string): Promise<VideoHistorySummary[]> {
    if (IS_REMOTE) {
        return http<VideoHistorySummary[]>(`/api/assets/${assetId}/video-versions`);
    }

    return [];
}

export async function getVideoVersionDetail(assetId: string, videoVersionId: string): Promise<VideoHistoryDetail> {
    if (IS_REMOTE) {
        return http<VideoHistoryDetail>(`/api/assets/${assetId}/video-versions/${videoVersionId}`);
    }

    return {
        asset_id: assetId,
        video_version_id: videoVersionId,
        created_at: new Date().toISOString(),
        status: "completed",
        is_active_version: true,
        scene_count: 4,
        aspect_ratio: "16:9",
        archetype: "human_payoff",
        voiceover_enabled: true,
        voice_name: "Zephyr",
        video_url: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        render_metadata: {},
        version_input: {
            scene_count: 4,
            aspect_ratio: "16:9",
            transition_mode: "auto",
            archetype: { name: "human_payoff" },
            protagonist: { text: "Tech-savvy millennial", type: "default" },
            voiceover: { voice_name: "Zephyr", voice_toggle: "true" },
            ref_images: []
        },
        blueprint: {
            scenes: [],
            needs_voiceover: true,
            voiceover_script: "Mock script",
            aspect_ratio: "16:9",
            transition_mode: "auto",
            ad_archetype: "human_payoff",
            protagonist_profile: { description: "Tech-savvy millennial", type: "default" },
            ref_images: []
        }
    };
}
