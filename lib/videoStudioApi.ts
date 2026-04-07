import { http } from "./http";
import { IS_REMOTE } from "./config";
import { 
    VideoPlanRequest, 
    ArchetypeOption, 
    ProtagonistOption, 
    VoiceoverOption 
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
    
    // Mock Fallback matching the provided JSON
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

export async function generateVideoPlan(assetId: string, payload: VideoPlanRequest): Promise<any> {
    if (IS_REMOTE) {
        return http(`/api/assets/${assetId}/video-plan`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    // Mock response simulating a generated plan
    return new Promise(resolve => setTimeout(() => {
        resolve({
            status: "success",
            plan: {
                director_notes: "The vision for this sequence is to capture the intersection of synthetic light and biological movement. We are aiming for a 'Techno-Organic' aesthetic. Keep the shadows deep and the highlights vibrant. This plan serves as the architectural foundation for our neural rendering engine.",
                scenes: Array.from({ length: payload.scene_count }).map((_, i) => ({
                    index: i + 1,
                    prompt: i === 0 
                        ? `Cinematic tracking shot for scene ${i + 1}. Cyber-lime spores float in the air. 8k resolution, photorealistic, anamorphic lens flare.`
                        : `Close-up shot for scene ${i + 1}. Reflections visible. Electric highlights, extreme macro photography.`
                })),
                voiceover_script: payload.voiceover.enabled 
                    ? "The horizon is no longer a limit. It is an invitation. Within the obsidian lens, we find the clarity of the unseen."
                    : ""
            }
        });
    }, 1500));
}
