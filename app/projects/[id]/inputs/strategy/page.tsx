"use client";
import { useParams, useRouter } from "next/navigation";
import { useProjectStore } from "../../../../../store/useProjectStore";
import { useState } from "react";

// 🔥 Added generateStrategyTags to your imports
import { updateProject, generateStrategyTags } from "../../../../../lib/api";
import type { StrategyInputs } from "../../../../../lib/api";

export default function StrategyInputsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const store = useProjectStore();

  const [goal, setGoal] = useState(store.strategy.goal);
  const [audience, setAudience] = useState(store.strategy.audience);
  const [styles, setStyles] = useState<string[]>(store.strategy.campaignStyles);
  const [align, setAlign] = useState<boolean>(store.strategy.alignWithEvents);
  const [region, setRegion] = useState(store.strategy.region || "US");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [preferencesTags, setPreferencesTags] = useState(
    store.strategy.preferences?.tags?.join(", ") || ""
  );
  const [constraints, setConstraints] = useState(
    store.strategy.preferences?.constraints || ""
  );

  const [isLoading, setIsLoading] = useState(false);
  // 🔥 NEW: Loading state just for the tag generator button
  const [isGeneratingTags, setIsGeneratingTags] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  function toggleStyle(s: string) {
    setStyles((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  // 🔥 NEW: The function that calls our new AI endpoint
  async function handleAutoGenerateTags() {
    setIsGeneratingTags(true);
    try {
      const res = await generateStrategyTags(id as string, {
        goal,
        audience,
        campaignStyles: styles
      });
      if (res.tags && res.tags.length > 0) {
        // Formats the returned array into a comma-separated string for the input box
        setPreferencesTags(res.tags.join(", "));
      }
    } catch (err) {
      console.error("Failed to generate tags", err);
    } finally {
      setIsGeneratingTags(false);
    }
  }

  async function handleReviewClick() {
    setIsLoading(true);
    setError(null);

    const strategyData: StrategyInputs = {
      ...store.strategy,
      goal: goal,
      audience: audience,
      campaignStyles: styles,
      alignWithEvents: align,
      region: region,
      preferences: {
        ...store.strategy.preferences,
        tags: preferencesTags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        constraints: constraints,
      },
    };

    try {
      await updateProject(id, { strategy: strategyData });
      store.updateStrategy(strategyData);
      router.push(`/projects/${id}/review`);
    } catch (err) {
      console.error(err);
      setError("Failed to save strategy. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Strategy Inputs</h1>
        <p className="text-sm text-gray-600">
          Minimal fields with progressive disclosure.
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-4">
        <div>
          <label className="block text-sm mb-1">Primary Goal</label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Awareness + Signups"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Audience</label>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="e.g., Busy pros in tech hubs"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Campaign Styles</label>
          <div className="flex flex-wrap gap-2">
            {["Social", "Events", "Email", "PR", "Influencers"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStyle(s)}
                className={`text-xs px-3 py-1 rounded-full border ${
                  styles.includes(s) ? "bg-black text-white" : ""
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            id="align"
            type="checkbox"
            checked={align}
            onChange={(e) => setAlign(e.target.checked)}
          />
          <label htmlFor="align" className="text-sm">
            Align with upcoming events?
          </label>
        </div>
        {align && (
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-sm mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="Global">Global</option>
                <option value="North America">North America</option>
                <option value="Latin America">Latin America</option>
                <option value="Europe">Europe</option>
                <option value="Middle East">Middle East</option>
                <option value="GCC">GCC (Gulf Cooperation Council)</option>
                <option value="Africa">Africa</option>
                <option value="Asia Pacific">Asia Pacific</option>
              </select>
            </div>
          </div>
        )}
        <button
          className="text-sm text-gray-700 underline"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? "Hide" : "Show"} details
        </button>

        {showAdvanced && (
          <div className="grid gap-3 md:grid-cols-2">
            
            {/* 🔥 UPDATED: Preferences (tags) section with the magic button */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm">Preferences (tags)</label>
                <button
                  type="button"
                  onClick={handleAutoGenerateTags}
                  // Disable the button if it's already loading, or if the user hasn't typed a goal/audience yet
                  disabled={isGeneratingTags || (!goal && !audience)}
                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingTags ? "✨ Generating..." : " Auto-generate"}
                </button>
              </div>
              <input
                className="w-full border rounded px-2 py-1"
                placeholder="e.g., UGC, creators"
                value={preferencesTags}
                onChange={(e) => setPreferencesTags(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">Used to find market intel on Reddit.</p>
            </div>

            <div>
              <label className="block text-sm mb-1">Constraints</label>
              <input
                className="w-full border rounded px-2 py-1"
                placeholder="e.g., Legal approvals needed"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 rounded border"
          onClick={() => router.push(`/projects/${id}/inputs/brand`)}
          disabled={isLoading}
        >
          Back
        </button>
        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={handleReviewClick}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Review"}
        </button>
      </div>

      {error && (
        <div className="text-right text-sm text-red-600 mt-2">{error}</div>
      )}
    </div>
  );
}