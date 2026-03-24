"use client";
export function PhaseStepper({
  phases,
  current,
  phase2Stage,
}: {
  phases: Record<1 | 2 | 3 | 4 | 5, string>;
  current: number;
  phase2Stage?: "2a" | "2b";
}) {
  const normalizedCurrent = current > 3 ? 3 : current < 1 ? 1 : current;
  const items: { id: 1 | 2 | 3; label: string; sublabel?: string }[] = [
    { id: 1, label: "Intelligence" },
    { id: 2, label: "Strategy", sublabel: `Stage ${phase2Stage || "2a"}` },
    { id: 3, label: "Creative" },
  ];

  return (
    <div className="flex items-center gap-3">
      {items.map((p) => {
        const active = normalizedCurrent === p.id;
        const state = phases[p.id];
        return (
          <div
            key={p.id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded border ${
              active ? "bg-black text-white" : "bg-white"
            }`}
          >
            <span className="text-xs font-medium">{p.label}</span>
            {p.sublabel ? (
              <span className="text-[10px] uppercase tracking-wide opacity-70">{p.sublabel}</span>
            ) : null}
            <span className="text-[10px] uppercase tracking-wide opacity-70">{state}</span>
          </div>
        );
      })}
    </div>
  );
}
