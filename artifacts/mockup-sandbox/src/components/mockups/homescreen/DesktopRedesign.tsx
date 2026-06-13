const WORLDS = [
  { name: "Sunny Fields", emoji: "🌻", levels: "1–10", color: "#fef3c7", accent: "#f59e0b", done: 10 },
  { name: "Mystic Forest", emoji: "🌲", levels: "11–20", color: "#d1fae5", accent: "#10b981", done: 0 },
  { name: "Sky Kingdom", emoji: "☁️", levels: "21–30", color: "#dbeafe", accent: "#3b82f6", done: 0 },
];

const RECENT_ACHIEVEMENTS = [
  { icon: "🐱", title: "First Catch", desc: "Complete your first level" },
  { icon: "⚡", title: "Speed Demon", desc: "80% time remaining" },
];

export function DesktopRedesign() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fef3c7, #fbcfe8)" }}
    >
      {/* Richer animated background — cheese, stars, paw prints + circles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { emoji: "🧀", size: 32, top: "8%",  left: "3%",  opacity: 0.55 },
          { emoji: "⭐", size: 28, top: "18%", left: "11%", opacity: 0.45 },
          { emoji: "🐾", size: 26, top: "35%", left: "6%",  opacity: 0.40 },
          { emoji: "🧀", size: 24, top: "55%", left: "2%",  opacity: 0.50 },
          { emoji: "⭐", size: 30, top: "72%", left: "9%",  opacity: 0.45 },
          { emoji: "🐾", size: 22, top: "85%", left: "15%", opacity: 0.35 },
          { emoji: "🧀", size: 28, top: "5%",  right: "4%", opacity: 0.55 },
          { emoji: "⭐", size: 26, top: "22%", right: "8%", opacity: 0.45 },
          { emoji: "🐾", size: 24, top: "42%", right: "3%", opacity: 0.40 },
          { emoji: "🧀", size: 30, top: "60%", right: "11%",opacity: 0.50 },
          { emoji: "⭐", size: 22, top: "78%", right: "6%", opacity: 0.45 },
          { emoji: "🐾", size: 28, top: "90%", right: "13%",opacity: 0.35 },
        ].map((d, i) => (
          <div
            key={i}
            className="absolute select-none"
            style={{
              fontSize: d.size,
              top: d.top,
              left: (d as any).left,
              right: (d as any).right,
              opacity: d.opacity,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))",
            }}
          >
            {d.emoji}
          </div>
        ))}
        {/* Soft gradient circles */}
        {[
          { bg: "#f97316", top: "5%",  left: "20%", size: 200 },
          { bg: "#a78bfa", top: "60%", left: "8%",  size: 160 },
          { bg: "#34d399", top: "30%", right: "15%", size: 180 },
          { bg: "#60a5fa", top: "75%", right: "5%",  size: 140 },
        ].map((c, i) => (
          <div
            key={`circle-${i}`}
            className="absolute rounded-full opacity-15"
            style={{
              width: c.size, height: c.size,
              background: c.bg,
              top: c.top,
              left: (c as any).left,
              right: (c as any).right,
            }}
          />
        ))}
      </div>

      {/* Settings button */}
      <div className="absolute top-4 right-4 z-30 bg-white/70 rounded-full w-11 h-11 flex items-center justify-center shadow border-2 border-white cursor-pointer">
        ⚙️
      </div>

      {/* Three-column desktop layout */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-0 items-center px-4 lg:px-6 py-10">

        {/* ── LEFT PANEL (desktop only) ── */}
        <div className="hidden lg:flex flex-col gap-4 py-8">

          {/* Player card */}
          <div className="bg-white/80 backdrop-blur border-2 border-orange-200 rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-3xl shadow-inner">🐱</div>
              <div>
                <div className="font-black text-lg leading-tight">Your Stats</div>
                <div className="text-xs text-gray-500 font-semibold">Keep it up!</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Level", val: "1", icon: "🏆" },
                { label: "Caught", val: "0", icon: "🐭" },
                { label: "Stars", val: "0 ⭐", icon: "⭐" },
                { label: "Badges", val: "0", icon: "🏅" },
              ].map((s) => (
                <div key={s.label} className="bg-orange-50 rounded-xl px-3 py-2 text-center">
                  <div className="font-black text-lg leading-none">{s.val}</div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* World Progress */}
          <div className="bg-white/80 backdrop-blur border-2 border-purple-200 rounded-3xl p-5 shadow-lg">
            <div className="font-black text-sm uppercase tracking-widest text-purple-600 mb-3">World Progress</div>
            <div className="flex flex-col gap-2.5">
              {WORLDS.map((w) => (
                <div key={w.name} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0"
                    style={{ background: w.color, border: `2px solid ${w.accent}` }}
                  >
                    {w.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{w.name}</div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-0.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{ width: `${(w.done / 10) * 100}%`, background: w.accent }}
                      />
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex-shrink-0">{w.done}/10</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent achievement */}
          <div className="bg-white/80 backdrop-blur border-2 border-yellow-200 rounded-3xl p-4 shadow-lg">
            <div className="font-black text-sm uppercase tracking-widest text-yellow-600 mb-3">Recent Badges</div>
            {RECENT_ACHIEVEMENTS.map((a) => (
              <div key={a.title} className="flex items-center gap-3 py-1.5">
                <div className="w-9 h-9 rounded-xl bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center text-xl flex-shrink-0">{a.icon}</div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{a.title}</div>
                  <div className="text-[10px] text-gray-400 font-semibold truncate">{a.desc}</div>
                </div>
                <span className="text-yellow-500 font-bold flex-shrink-0">✓</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── CENTER PANEL ── (same on all viewports) */}
        <div className="flex flex-col items-center justify-center py-8 px-2">

          {/* Badge */}
          <div className="bg-white/80 border-4 border-orange-400 rounded-3xl px-4 py-1.5 mb-3 shadow -rotate-2">
            <span className="font-bold text-xs sm:text-sm uppercase tracking-widest text-orange-500">An Arcade Adventure</span>
          </div>

          {/* Title */}
          <h1 className="font-black text-6xl sm:text-8xl leading-none text-center mb-1">
            <span className="text-orange-500" style={{ textShadow: "3px 3px 0 #a78bfa" }}>CAT</span>
            <span className="text-gray-800"> CHASE</span>
          </h1>
          <p className="font-black text-2xl sm:text-3xl text-purple-500 mb-2">Mouse Hunt</p>
          <p className="font-black text-lg text-orange-500 text-center">Chase mice. Beat levels.</p>
          <p className="font-black text-lg text-purple-500 text-center mb-1">Unlock achievements.</p>
          <p className="text-xs text-gray-500 font-semibold mb-1">30 levels · 3 worlds · 24 achievements</p>
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-5">
            ✅ Free · No download · No login
          </span>

          {/* Cat chase animation */}
          <div className="relative h-20 w-full max-w-xs mb-5">
            <div className="absolute top-2 left-4 text-4xl">🐭</div>
            <div className="absolute top-0 left-16 text-5xl">🐱</div>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gray-300/40 rounded-full" />
          </div>

          {/* Stats */}
          <div className="flex gap-2 mb-5">
            <div className="bg-white/80 border-2 border-gray-200 rounded-2xl px-4 py-2 shadow">
              <span className="font-bold text-sm">🏆 Level 1</span>
            </div>
            <div className="bg-white/80 border-2 border-gray-200 rounded-2xl px-4 py-2 shadow">
              <span className="font-bold text-sm">❤️ 0 caught</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="w-full h-20 bg-orange-500 rounded-2xl flex items-center justify-center shadow-2xl cursor-pointer" style={{ boxShadow: "0 8px 32px rgba(249,115,22,0.45)" }}>
              <span className="font-black text-3xl text-white">▶ PLAY</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: "🗺️", label: "Levels" },
                { icon: "📖", label: "How To" },
                { icon: "🎮", label: "Modes" },
                { icon: "🏅", label: "Badges", badge: "2" },
              ].map((b) => (
                <div key={b.label} className="relative bg-purple-100 border-2 border-purple-200 rounded-xl h-14 flex flex-col items-center justify-center gap-0.5 shadow cursor-pointer hover:bg-purple-200 transition-colors">
                  <span className="text-xl">{b.icon}</span>
                  <span className="font-bold text-xs text-purple-700">{b.label}</span>
                  {b.badge && (
                    <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{b.badge}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (desktop only) ── */}
        <div className="hidden lg:flex flex-col gap-4 py-8">

          {/* World preview cards */}
          <div className="bg-white/80 backdrop-blur border-2 border-blue-200 rounded-3xl p-5 shadow-lg">
            <div className="font-black text-sm uppercase tracking-widest text-blue-600 mb-3">Worlds</div>
            <div className="flex flex-col gap-2">
              {WORLDS.map((w, i) => (
                <div
                  key={w.name}
                  className="relative rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all"
                  style={{ background: w.color, border: `2px solid ${w.accent}`, opacity: i === 0 ? 1 : 0.6 }}
                >
                  <div className="text-3xl">{w.emoji}</div>
                  <div>
                    <div className="font-black text-sm">{w.name}</div>
                    <div className="text-[11px] font-bold" style={{ color: w.accent }}>Levels {w.levels}</div>
                  </div>
                  {i > 0 && (
                    <div className="absolute right-3 top-3 text-lg opacity-60">🔒</div>
                  )}
                  {i === 0 && (
                    <div className="absolute right-3 top-3 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">ACTIVE</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tip of the day */}
          <div className="bg-white/80 backdrop-blur border-2 border-green-200 rounded-3xl p-5 shadow-lg">
            <div className="font-black text-sm uppercase tracking-widest text-green-600 mb-2">💡 Pro Tip</div>
            <p className="text-sm text-gray-600 font-semibold leading-snug">
              Drop 🧀 <strong>cheese bait</strong> to lure mice to one spot — then pounce for an easy catch!
            </p>
          </div>

          {/* Game mode teaser */}
          <div className="bg-white/80 backdrop-blur border-2 border-red-200 rounded-3xl p-5 shadow-lg">
            <div className="font-black text-sm uppercase tracking-widest text-red-500 mb-3">🔥 Special Modes</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 bg-orange-50 rounded-xl px-3 py-2.5 cursor-pointer border border-orange-200">
                <span className="text-2xl">⏱️</span>
                <div>
                  <div className="font-black text-sm">Time Attack</div>
                  <div className="text-[10px] text-gray-400 font-semibold">60s · Catch as many as you can</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-purple-50 rounded-xl px-3 py-2.5 cursor-pointer border border-purple-200">
                <span className="text-2xl">🌊</span>
                <div>
                  <div className="font-black text-sm">Survival</div>
                  <div className="text-[10px] text-gray-400 font-semibold">Endless waves · How long can you last?</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
