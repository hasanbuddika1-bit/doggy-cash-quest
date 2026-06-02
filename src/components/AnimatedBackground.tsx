import { useMemo } from "react";

export function AnimatedBackground() {
  const sparkles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      size: 8 + Math.random() * 14,
    })), []
  );

  const floaters = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${10 + Math.random() * 8}s`,
      size: 18 + Math.random() * 14,
      emoji: ["💵", "🪙", "🐰", "✨", "🌸"][i % 5],
    })), []
  );

  return (
    <>
      {/* Deep gradient base */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% -10%, hsl(var(--bunny-pink) / 0.25), transparent 55%)," +
            "radial-gradient(circle at 0% 50%, hsl(var(--bunny-lavender) / 0.18), transparent 55%)," +
            "radial-gradient(circle at 100% 80%, hsl(var(--bunny-gold) / 0.12), transparent 50%)," +
            "linear-gradient(180deg, hsl(var(--bunny-purple-deep)) 0%, hsl(var(--background)) 70%)",
        }}
      />

      {/* Sparkles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {sparkles.map((s) => (
          <div
            key={s.id}
            className="absolute animate-sparkle"
            style={{ left: s.left, top: s.top, fontSize: s.size, animationDelay: s.delay }}
          >
            ✨
          </div>
        ))}
        {floaters.map((f) => (
          <div
            key={`f-${f.id}`}
            className="absolute animate-float-up"
            style={{
              left: f.left,
              bottom: "-30px",
              ['--delay' as any]: f.delay,
              ['--duration' as any]: f.duration,
              animationDelay: f.delay,
              animationDuration: f.duration,
            }}
          >
            <span style={{ fontSize: f.size }} className="opacity-25">{f.emoji}</span>
          </div>
        ))}
      </div>
    </>
  );
}
