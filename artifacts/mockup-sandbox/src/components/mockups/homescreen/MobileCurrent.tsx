export function MobileCurrent() {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg, #fef3c7, #fbcfe8)" }}
    >
      {/* Floating blobs */}
      {[
        { w: 90, h: 90, bg: "#f97316", top: "10%", left: "5%" },
        { w: 120, h: 120, bg: "#a78bfa", top: "23%", left: "19%" },
        { w: 150, h: 150, bg: "#34d399", top: "36%", left: "33%" },
        { w: 180, h: 180, bg: "#fbbf24", top: "49%", left: "47%" },
        { w: 210, h: 210, bg: "#60a5fa", top: "62%", left: "61%" },
        { w: 240, h: 240, bg: "#fb7185", top: "75%", left: "75%" },
      ].map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20 pointer-events-none"
          style={{ width: b.w, height: b.h, background: b.bg, top: b.top, left: b.left }}
        />
      ))}

      {/* Badge */}
      <div className="z-10 bg-white/80 border-4 border-orange-400 rounded-3xl px-4 py-1.5 mb-3 shadow -rotate-2">
        <span className="font-bold text-xs uppercase tracking-widest text-orange-500">An Arcade Adventure</span>
      </div>

      {/* Title */}
      <h1 className="z-10 font-black text-6xl leading-none text-center mb-1">
        <span className="text-orange-500" style={{ textShadow: "3px 3px 0 #a78bfa" }}>CAT</span>
        <span className="text-gray-800"> CHASE</span>
      </h1>
      <p className="z-10 font-black text-2xl text-purple-500 mb-1">Mouse Hunt</p>
      <p className="z-10 font-black text-base text-orange-500 text-center">Chase mice. Beat levels.</p>
      <p className="z-10 font-black text-base text-purple-500 text-center mb-1">Unlock achievements.</p>
      <p className="z-10 text-xs text-gray-500 font-semibold mb-1">30 levels · 3 worlds · 24 achievements</p>
      <span className="z-10 inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full mb-5">
        ✅ Free · No download · No login
      </span>

      {/* Cat animation area */}
      <div className="z-10 relative h-20 w-64 mb-5">
        <div className="absolute top-2 left-2 text-4xl">🐭</div>
        <div className="absolute top-0 left-12 text-5xl">🐱</div>
        <div className="absolute bottom-0 inset-x-0 h-1.5 bg-gray-300/40 rounded-full" />
      </div>

      {/* Stats */}
      <div className="z-10 flex gap-2 mb-5">
        <div className="bg-white/80 border-2 border-gray-200 rounded-2xl px-4 py-2 text-center shadow">
          <span className="font-bold text-sm">🏆 Level 1</span>
        </div>
        <div className="bg-white/80 border-2 border-gray-200 rounded-2xl px-4 py-2 text-center shadow">
          <span className="font-bold text-sm">❤️ 0 caught</span>
        </div>
      </div>

      {/* Buttons */}
      <div className="z-10 w-full max-w-xs flex flex-col gap-3">
        <div className="w-full h-20 bg-orange-500 rounded-xl flex items-center justify-center shadow-xl cursor-pointer">
          <span className="font-black text-3xl text-white">▶ PLAY</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: "🗺️", label: "Levels" },
            { icon: "📖", label: "How To" },
            { icon: "🎮", label: "Modes" },
            { icon: "🏅", label: "Badges" },
          ].map((b) => (
            <div key={b.label} className="bg-purple-100 border-2 border-purple-200 rounded-xl h-14 flex flex-col items-center justify-center gap-0.5 shadow cursor-pointer">
              <span className="text-lg">{b.icon}</span>
              <span className="font-bold text-xs text-purple-700">{b.label}</span>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-gray-400 font-bold mt-1">Credits</div>
      </div>

      {/* Annotation: problem areas */}
      <div className="z-20 absolute top-4 right-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
        ⚠️ Dead space →
      </div>
      <div className="z-20 absolute bottom-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow">
        ⚠️ Dead space ←
      </div>
    </div>
  );
}
