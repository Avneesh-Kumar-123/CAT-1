const problems = [
  {
    icon: "❌",
    color: "#ef4444",
    title: "Dead horizontal space",
    desc: "On 1280px+ screens, 40% of the viewport on each side is empty. Floating circles don't add value — they're decorative without being functional.",
    impact: "HIGH",
  },
  {
    icon: "❌",
    color: "#ef4444",
    title: "No player context",
    desc: "The home screen shows 'Level 1 / 0 caught' but no visual of progress — no world map, no achievement showcase, no sense of journey.",
    impact: "HIGH",
  },
  {
    icon: "❌",
    color: "#ef4444",
    title: "Secondary nav feels flat",
    desc: "All 4 secondary buttons look identical. There's no visual hierarchy distinguishing Modes (special!) from Levels (utility).",
    impact: "MED",
  },
  {
    icon: "❌",
    color: "#f97316",
    title: "Game modes are buried",
    desc: "Time Attack and Survival are now under a 'Modes' button, but right panel preview cards on desktop surface them immediately.",
    impact: "MED",
  },
  {
    icon: "❌",
    color: "#f97316",
    title: "No first-impression wow",
    desc: "The cat/mouse animation is tiny. Top games use a cinematic hero moment (animated character, particle burst) that makes you want to play.",
    impact: "MED",
  },
];

const solutions = [
  {
    icon: "✅",
    color: "#10b981",
    title: "3-column desktop layout",
    desc: "Left panel: player stats + world progress + recent achievements. Right panel: world cards + pro tip + mode teasers. Center stays unchanged on mobile.",
    impact: "HIGH",
  },
  {
    icon: "✅",
    color: "#10b981",
    title: "Rich floating decorations",
    desc: "Replace plain circles with themed emojis (🧀⭐🐾) at low opacity — immediately communicates game identity while filling dead space elegantly.",
    impact: "HIGH",
  },
  {
    icon: "✅",
    color: "#10b981",
    title: "Player stats card (left)",
    desc: "Shows Level, Caught, Stars, Badges in a compact grid. Returns players to their exact progress — a retention hook. Top games call this 'session anchoring'.",
    impact: "HIGH",
  },
  {
    icon: "✅",
    color: "#10b981",
    title: "World progress panel (left)",
    desc: "Visual progress bars for each world. Creates goal-gradient effect — players see how close they are to unlocking the next world and re-engage.",
    impact: "HIGH",
  },
  {
    icon: "✅",
    color: "#10b981",
    title: "World preview cards (right)",
    desc: "Shows all 3 worlds with lock state. Locked worlds create FOMO and motivate continued play. Top games like Subway Surfers use world unlocks as the core loop.",
    impact: "MED",
  },
  {
    icon: "✅",
    color: "#10b981",
    title: "PLAY button glow shadow",
    desc: "Add colored drop-shadow under the PLAY button (orange glow). Minimal code change, dramatic premium feel — eye immediately goes there.",
    impact: "MED",
  },
  {
    icon: "✅",
    color: "#3b82f6",
    title: "Badge counter on Modes button",
    desc: "Show a small dot/count badge if new achievements are earned. Creates notification-loop psychology that drives re-engagement.",
    impact: "LOW",
  },
];

export function DesignAnalysis() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-1">UI/UX Analysis Report</h1>
          <p className="text-gray-500 font-semibold">Cat Chase: Mouse Hunt — Home Screen</p>
          <div className="flex justify-center gap-3 mt-3">
            <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full">5 Problems Found</span>
            <span className="bg-green-100 text-green-600 text-xs font-bold px-3 py-1 rounded-full">7 Solutions Proposed</span>
          </div>
        </div>

        {/* What top games do */}
        <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 mb-6 shadow-sm">
          <h2 className="font-black text-lg text-blue-700 mb-3">🎯 What Top Mobile Games Do on Desktop</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { game: "Clash of Clans", lesson: "Persistent stats panel left, resource bar top — players always know their progress" },
              { game: "Subway Surfers", lesson: "World selector dominates the hero — excitement comes from seeing locked worlds" },
              { game: "Candy Crush", lesson: "Map/progress is the home screen — the level map IS the meta-game loop" },
            ].map((g) => (
              <div key={g.game} className="bg-blue-50 rounded-2xl p-3">
                <div className="font-black text-sm text-blue-800 mb-1">{g.game}</div>
                <div className="text-xs text-gray-600 leading-snug">{g.lesson}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Problems */}
        <h2 className="font-black text-lg text-red-600 mb-3">Problems (Ranked by Impact)</h2>
        <div className="flex flex-col gap-3 mb-6">
          {problems.map((p, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 p-4 shadow-sm flex items-start gap-4" style={{ borderColor: p.color + "40" }}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{p.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-sm">{p.title}</span>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: p.color + "20", color: p.color }}
                  >
                    {p.impact}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Solutions */}
        <h2 className="font-black text-lg text-green-600 mb-3">Proposed Solutions (Ranked by Impact)</h2>
        <div className="flex flex-col gap-3 mb-6">
          {solutions.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 p-4 shadow-sm flex items-start gap-4" style={{ borderColor: s.color + "40" }}>
              <div className="text-2xl flex-shrink-0 mt-0.5">{s.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-black text-sm">{s.title}</span>
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                    style={{ background: s.color + "20", color: s.color }}
                  >
                    {s.impact}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="bg-gradient-to-r from-orange-500 to-purple-500 rounded-3xl p-6 text-white text-center">
          <div className="text-3xl mb-2">🏆</div>
          <h2 className="font-black text-xl mb-1">Verdict</h2>
          <p className="text-sm font-semibold opacity-90 leading-relaxed">
            Mobile layout is solid. Desktop/laptop needs a 3-column layout to use the extra real estate
            for stats, world previews, and mode teasers. Zero gameplay changes required — only the home
            screen layout adapts responsively above <code className="bg-white/20 px-1 rounded">lg</code> breakpoint.
          </p>
        </div>
      </div>
    </div>
  );
}
