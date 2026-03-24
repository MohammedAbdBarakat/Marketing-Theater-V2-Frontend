"use client";
import { nanoid } from "nanoid";
import dayjs from "dayjs";
import { appendCalendarDay, savePhaseResult } from "./api";
import { IS_REMOTE, API_BASE } from "./config";
import type { IntelligenceReport } from "../types/intelligence";

export type StreamEvent =
  | { type: "phase_start"; phase: number; title: string; participants: string[] }
  | { type: "log"; phase: number; speaker: string; text: string; ts: number }
  | { type: "phase_result"; phase: number; summary: string; artifacts: any[]; candidates?: any[] }
  | { type: "strategy_candidates"; items: any[]; recommendedId?: string }
  | { type: "calendar_day"; date: string; entries: any[] }
  | { type: "phase_1_signals_ready"; data: IntelligenceReport }
  | { type: "strategy_locked"; data: any }
  | { type: "skeleton_day_planned"; data: any }
  | { type: "phase_2_complete"; data: any }
  | { type: "campaign_events"; days: any[] }
  | { type: "status_update"; status: string }
  | { type: "phase_3_creative_ready"; calendar: any }
  | { type: "error"; message: string }
  | { type: "done" };

type Callbacks = {
  onEvent: (e: StreamEvent) => void;
  onError?: (msg: string) => void;
};

export function simulateRunStream(
  params: {
    runId: string;
    startDateISO: string;
    endDateISO: string;
    hasConfirmedSignals?: () => boolean;
    hasConfirmedStrategy?: () => boolean;
    hasConfirmedSkeleton?: () => boolean;
  },
  cb: Callbacks
): { stop: () => void; skipPhase: (phase: number) => void } {
  const timers: number[] = [];
  let stopped = false;

  function emit(e: StreamEvent) {
    cb.onEvent(e);
  }

  function schedule(fn: () => void, ms: number) {
    if (stopped) return;
    const id = window.setTimeout(fn, ms);
    timers.push(id);
  }

  async function runPhase(phase: 1 | 2 | 3) {
    const titles: Record<number, string> = {
      1: "Ideation Roundtable",
      2: "Creative Polish",
      3: "Channel Planning",
    };
    const participants: Record<number, string[]> = {
      1: ["CEO", "Creative Director", "Media Buyer"],
      2: ["Creative Director", "Copywriter", "Art Director"],
      3: ["Media Buyer"],
    };
    emit({ type: "phase_start", phase, title: titles[phase], participants: participants[phase] });

    const speakers = participants[phase];
    const lines = phase === 1 ? 12 : phase === 2 ? 10 : 8;
    for (let i = 0; i < lines; i++) {
      await new Promise<void>((res) =>
        schedule(() => {
          const speaker = speakers[i % speakers.length];
          emit({
            type: "log",
            phase,
            speaker,
            text:
              phase === 1
                ? sampleIdeationLog(i)
                : phase === 2
                  ? samplePolishLog(i)
                  : sampleChannelLog(i),
            ts: Date.now(),
          });
          res();
        }, 350 + Math.random() * 300)
      );
    }

    // Result per phase
    const result = phaseResults(phase);
    emit({ type: "phase_result", ...result });
    await savePhaseResult(params.runId, result);

    if (phase === 3) {
      const candidates = strategyCandidates();
      emit({ type: "strategy_candidates", ...candidates });
    }
  }

  async function runCalendarForSelected() {
    // Wait until selection exists
    let guard = 0;
    // Just a small delay before generating calendar in legacy mock
    while (guard < 240 && !stopped) {
      await new Promise<void>((r) => schedule(() => r(), 250));
      guard++;
    }
    if (stopped) return;

    // Generate day-by-day calendar within duration window
    const start = dayjs(params.startDateISO);
    const end = dayjs(params.endDateISO);
    let cursor = start.clone();
    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
      const entries = sampleEntriesForDate(cursor.toISOString());
      if (entries.length) {
        emit({ type: "calendar_day", date: cursor.format("YYYY-MM-DD"), entries });
        await appendCalendarDay(params.runId, cursor.format("YYYY-MM-DD"), entries);
      }
      await new Promise<void>((r) => schedule(() => r(), 200));
      cursor = cursor.add(1, "day");
    }
    emit({ type: "done" });
  }

  async function runPhase1Mock() {
    emit({ type: "phase_start", phase: 1, title: "Market Intelligence Gathering", participants: ["Perplexity API", "Reddit Scraper", "Calendarific"] });
    const toolLogs = [
      { speaker: "Perplexity Research", text: "Searching recent trends, competitors, and market news." },
      { speaker: "Reddit Scraper", text: "Scanning Reddit conversations for audience sentiment." },
      { speaker: "Calendarific", text: "Collecting relevant calendar moments and holidays." },
      { speaker: "Gemini Synthesizer", text: "Synthesizing the raw findings into a reviewable intelligence report." },
    ];

    for (const item of toolLogs) {
      await new Promise<void>((res) =>
        schedule(() => {
          emit({ type: "log", phase: 1, speaker: item.speaker, text: item.text, ts: Date.now() });
          res();
        }, 350)
      );
    }

    const mockIntelligenceData: IntelligenceReport = {
      global_intelligence: {
        competitor_landscape: [
          { title: "Creators are packaging tutorials as entertainment", description: "Top-performing competitors are blending education with faster hooks and stronger visual payoff.", source: "perplexity" },
        ],
        trending_topics: [
          { title: "UGC-style proof is outperforming polished studio content", description: "Current trend coverage points to stronger engagement on relatable demos and testimonial-led clips.", source: "perplexity" },
        ],
        audience_sentiment: [
          { title: "Users trust practical walkthroughs over hype", description: "Reddit discussions repeatedly ask for honest proof, setup clarity, and before/after examples.", source: "apify_reddit" },
        ],
        industry_news: [
          { title: "Competitors are moving faster on feature storytelling", description: "Recent launches are framed around one concrete use case at a time instead of broad benefit claims.", source: "perplexity" },
        ],
        strategic_opportunities: [
          "Lead with proof-driven hooks instead of abstract positioning.",
          "Build a repeatable creator brief around fast setup demos.",
        ],
      },
      day_capsules: [
        {
          day_index: 1,
          date: dayjs(params.startDateISO).format("YYYY-MM-DD"),
          signals: [
            {
              type: "event",
              name: "Startup Day",
              description: "A relevant moment that can support founder-led storytelling and product credibility.",
              implication: "Use this day for behind-the-scenes or founder POV content tied to momentum and innovation.",
              importance: "high",
              source: "calendarific",
            },
          ],
        },
      ],
    };
    emit({ type: "phase_1_signals_ready", data: mockIntelligenceData });
    emit({ type: "status_update", status: "waiting_for_signals" });
  }

  async function runPhase2StageA() {
      // Wait for user to confirm signals
      let guard = 0;
      while (!params.hasConfirmedSignals?.() && guard < 600 && !stopped) {
        await new Promise<void>((r) => schedule(() => r(), 250));
        guard++;
      }
      if (stopped) return;

      emit({ type: "status_update", status: "running" });
      emit({ type: "phase_start", phase: 2, title: "Strategy & Distribution Selection", participants: ["CEO", "Marketing Strategist", "Media Buyer"] });
      
      for (let i = 0; i < 5; i++) {
        await new Promise<void>((res) =>
          schedule(() => {
            emit({ type: "log", phase: 2, speaker: i % 2 === 0 ? "CEO" : "Strategist", text: `Debating strategy point ${i + 1}...`, ts: Date.now() });
            res();
          }, 350)
        );
      }

      const mockStrategy = {
          strategy_title: "Community-Led Growth",
          core_message: "We build for you, with you.",
          rationale: "Aligns with the rise in UGC and community trust.",
          intelligence_signals_used: ["Rise in UGC"],
          campaign_arc: [{ phase_name: "Awareness", day_start: 1, day_end: 3, focus: "Problem illustration" }],
          distribution_plan: { platform_weights: { "instagram": 0.6, "tiktok": 0.4 }, optimal_times: { "weekday": "18:00" }, content_mix: { "VIDEO": 0.8, "IMAGE": 0.2 } }
      };

      emit({ type: "strategy_locked", data: mockStrategy });
      emit({ type: "status_update", status: "waiting_for_strategy_approval" });
  }

  async function runPhase2StageB() {
       // Wait for user to confirm strategy
       let guard = 0;
       while (!params.hasConfirmedStrategy?.() && guard < 600 && !stopped) {
         await new Promise<void>((r) => schedule(() => r(), 250));
         guard++;
       }
       if (stopped) return;

       emit({ type: "status_update", status: "running" });

       const start = dayjs(params.startDateISO);
       const end = dayjs(params.endDateISO);
       let cursor = start.clone();
       let dayIndex = 1;

       while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
           const mockDay = {
               day_index: dayIndex,
               date: cursor.format("YYYY-MM-DD"),
               day_of_week: cursor.format("dddd"),
               goal: "Awareness",
               topic: "Problem Teaser",
               content_type: "VIDEO",
               platform: "tiktok",
               posting_time: "18:00",
               reasoning: { goal_reason: "Start strong", topic_reason: "Hook users", type_reason: "Algorithmic preference", time_reason: "Peak hours", signals_used: [] },
               creative_slots: { hook: null, caption: null, visual_direction: null, hashtags: null, cta: null }
           };
           
           emit({ type: "skeleton_day_planned", data: mockDay });
           
           await new Promise<void>((r) => schedule(() => r(), 400));
           cursor = cursor.add(1, "day");
           dayIndex++;
       }

       emit({ type: "phase_2_complete", data: { master_strategy: {}, skeleton: [] } });
       emit({ type: "status_update", status: "waiting_for_creative" });
      //  emit({ type: "done" });
  }

  async function runPhase3Mock() {
    // Small pause to simulate the transition from Phase 2 to Phase 3
    await new Promise<void>((r) => schedule(() => r(), 1500));
    if (stopped) return;

    emit({ type: "status_update", status: "running" });
    emit({ type: "phase_start", phase: 3, title: "Creative Production & Polish", participants: ["Leo (Copywriter)", "Maria (Art Director)", "Isabelle (Creative Director)"] });
    
    // Linear Theater Logs (Leo -> Maria -> Isabelle)
    const logs = [
      { phase: 3, speaker: "Leo (Copywriter)", text: "Drafting the hook for the Sunset Micro-Charter. Focusing on the sensory experience of Dubai's golden hour to drive exclusivity." },
      { phase: 3, speaker: "Maria (Art Director)", text: "Building the visual mood board. We need an ultra-luxurious, warm-toned drone shot that complements Leo's copy." },
      { phase: 3, speaker: "Isabelle (Creative Director)", text: "Reviewing Leo and Maria's work. Tweaking the hook to sound slightly more high-end. Everything aligns with the brand DNA. Approved." }
    ];

    for (const log of logs) {
      await new Promise<void>((res) =>
        schedule(() => {
          emit({ type: "log", ...log, ts: Date.now() });
          res();
        }, 1200 + Math.random() * 500) // Slightly slower pacing so user can read them
      );
    }

    // Realistic Dummy Data!
    const targetDate = dayjs(params.startDateISO).format("YYYY-MM-DD");
    const mockCreativeCalendar = {
      [targetDate]: [
        {
          skeleton: {
            day_index: 1,
            date: targetDate,
            platform: "instagram",
            content_type: "VIDEO",
            topic: "Sunset Micro-Charter Experience"
          },
          creative: {
            hook: "Dubai's golden hour, amplified. ✨",
            caption: "Imagine: The iconic Dubai skyline painted in fiery hues, viewed from the deck of your private luxury yacht. Escape the ordinary and elevate your evening with our exclusive 3-hour micro-charters. Unmatched service, unforgettable views.",
            hashtags: ["#JumeirahYachts", "#DubaiSunset", "#LuxuryLifestyle", "#DubaiMarina"],
            cta: "Click the link in bio to reserve your evening.",
            copywriting_reasoning: "Uses sensory language ('fiery hues') to paint a picture, instantly followed by a clear, exclusive solution (micro-charter).",
            visual_direction: {
              "mood": "Ultra-luxurious, intimate, and radiant.",
              "style_hint": "Breathtaking drone tracking shot of the yacht cutting through golden water, transitioning to a slow-motion close-up of champagne toasting on the aft deck.",
              "visual_reasoning": "The golden hour lighting establishes a premium, aspirational vibe that directly matches the 'amplified' hook."
            }
          }
        }
      ]
    };

    emit({ type: "phase_3_creative_ready", calendar: mockCreativeCalendar });
    emit({ type: "status_update", status: "waiting_for_creative_approval" });
  }

  async function orchestrate() {
    await runPhase1Mock();
    await runPhase2StageA();
    await runPhase2StageB();
    await runPhase3Mock();
  }

  orchestrate();

  return {
    stop() {
      stopped = true;
      timers.forEach((t) => clearTimeout(t));
    },
    skipPhase(_phase: number) {
      // No-op in simulation; could fast-forward by clearing timers
    },
  };

  // Helpers
  function phaseResults(phase: 1 | 2 | 3): any {
    if (phase === 1)
      return {
        phase,
        summary: "Three strong strategy directions synthesized from ideation.",
        artifacts: [
          { id: nanoid(6), title: "Momentum Launch", bullets: ["High-energy teasers", "UGC contests", "Cross-channel stunts"], risks: ["Production bandwidth", "Brand drift"] },
          { id: nanoid(6), title: "Trust & Proof", bullets: ["Founder stories", "Expert co-signs", "Use-case demos"], risks: ["Dry tone", "Long lead"] },
          { id: nanoid(6), title: "Hometown Hero", bullets: ["Local events", "Cause tie-ins", "Neighborhood media"], risks: ["Regional dilution", "Ops overhead"] },
        ],
      };
    if (phase === 2)
      return {
        phase,
        summary: "Refined directions with value props, tone, and pillars.",
        artifacts: [
          { title: "Value Props", items: ["Fastest to value", "Delightful UX", "Community-first"] },
          { title: "Tone", items: ["Confident", "Witty", "Practical"] },
          { title: "Content Pillars", items: ["Proof", "People", "Play"] },
        ],
      };
    return {
      phase,
      summary: "Channel plans with sample posts and budgets.",
      artifacts: [
        { channel: "TikTok", kpis: ["Views", "Saves"], budget: "$8-12k/mo", samplePost: "POV: You just discovered..." },
        { channel: "Email", kpis: ["CTR", "Reply"], budget: "$1-2k/mo", samplePost: "Subject: 3-minute wins" },
        { channel: "IRL Events", kpis: ["Signups", "Leads"], budget: "$5-8k/mo", samplePost: "Meetup playbook v1" },
      ],
    };
  }

  function strategyCandidates() {
    const items = [
      { id: "A", name: "Momentum Launch", rationale: "High reach burst with UGC flywheel.", highlights: ["UGC contests", "Creator collabs", "Hype window"] },
      { id: "B", name: "Trust & Proof", rationale: "Compounding credibility via proofs.", highlights: ["Case studies", "Expert features", "Tested offers"] },
      { id: "C", name: "Hometown Hero", rationale: "Local depth and community.", highlights: ["Event cadence", "Cause tie-ins", "Press angles"] },
    ];
    return { items, recommendedId: "B" };
  }

  function sampleEntriesForDate(dateISO: string) {
    const d = dayjs(dateISO);
    const weekday = d.day();
    const entries: any[] = [];
    if (weekday === 2) {
      entries.push({ id: nanoid(6), date: d.format("YYYY-MM-DD"), channel: "TikTok", type: "Video", title: "Duet a creator", effort: "med", owner: "Social", description: "Duet a mid-tier creator’s tutorial with our product overlay.", relatedEvents: ["#UGCWeek"] });
    }
    if (weekday === 4) {
      entries.push({ id: nanoid(6), date: d.format("YYYY-MM-DD"), channel: "Email", type: "Newsletter", title: "3-Minute Wins", effort: "low", owner: "CRM", description: "Tips newsletter featuring 3 quick wins with CTA.", relatedEvents: ["#WebinarNextWeek"] });
    }
    if (weekday === 6) {
      entries.push({ id: nanoid(6), date: d.format("YYYY-MM-DD"), channel: "Events", type: "Meetup", title: "Coffee & Q&A", effort: "high", owner: "Field", description: "Local meetup with founder Q&A", relatedEvents: ["Local Tech Fest"] });
    }
    return entries;
  }

  function sampleIdeationLog(i: number) {
    const msgs = [
      "What if we flip the reveal?",
      "Users do the setup, we amplify.",
      "Creator collab week one.",
      "Hook is the before/after.",
      "We seed insiders on day 0.",
      "Risks: production bottlenecks.",
      "Counter: templated briefs.",
      "Need a cause partner.",
      "Geo-first press angle.",
      "Earned media checklist.",
      "Okay, three directions forming.",
      "Aligning on constraints...",
    ];
    return msgs[i % msgs.length];
  }

  function samplePolishLog(i: number) {
    const msgs = [
      "Value props tightened.",
      "Tone: confident, witty, practical.",
      "Pillars: Proof, People, Play.",
      "Templating hooks now.",
      "Brand-safe color ramps.",
      "Risks documented.",
      "Visual language: bold sans.",
      "Motion: gentle parallax.",
      "Check ADA contrast.",
      "Polish complete.",
    ];
    return msgs[i % msgs.length];
  }

  function sampleChannelLog(i: number) {
    const msgs = [
      "TikTok: 3x/week, creator-led.",
      "Email: weekly wins.",
      "IG: reels + carousels.",
      "Events: monthly meetups.",
      "KPIs: saves, CTR, signups.",
      "Budget ranges drafted.",
      "Sample posts attached.",
      "Comparative report ready.",
    ];
    return msgs[i % msgs.length];
  }
}

export function attach(cb: Callbacks) {
  return cb;
}

export function connectStream(
  runId: string,
  cb: Callbacks,
  mockParams?: {
    startDateISO: string;
    endDateISO: string;
    hasConfirmedSignals?: () => boolean;
    hasConfirmedStrategy?: () => boolean;
    hasConfirmedSkeleton?: () => boolean;
  }
) {
  if (IS_REMOTE) {
    const es = new EventSource(`${API_BASE}/runs/${runId}/stream`, { withCredentials: true } as any);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        cb.onEvent(data);
      } catch (e) {
        cb.onError?.(`SSE parse error`);
      }
    };
    es.onerror = () => {
      cb.onError?.("SSE error");
    };
    return {
      stop() { es.close(); },
      skipPhase() { },
    };
  }
  
  // Local Mock Mode
  if (mockParams) {
      return simulateRunStream({
          runId,
          ...mockParams
      }, cb);
  }

  return { stop: () => { }, skipPhase: () => { } }; 
}