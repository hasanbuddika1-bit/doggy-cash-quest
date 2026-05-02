import { useMemo } from "react";
import bgImage from "@/assets/doggy-bg.png";

export function AnimatedBackground() {
  const coins = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${8 + Math.random() * 6}s`,
      size: 16 + Math.random() * 16,
    })), []
  );

  const paws = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 5}s`,
    })), []
  );

  return (
    <>
      {/* Branded background image */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
        }}
      />
      {/* Warm gold gradient overlay so content stays readable */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.85) 60%, hsl(var(--background) / 0.95) 100%)',
        }}
      />
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {coins.map((coin) => (
          <div
            key={coin.id}
            className="absolute animate-float-up"
            style={{
              left: coin.left,
              bottom: '-30px',
              '--delay': coin.delay,
              '--duration': coin.duration,
              animationDelay: coin.delay,
              animationDuration: coin.duration,
            } as React.CSSProperties}
          >
            <span style={{ fontSize: coin.size }} className="opacity-25">🪙</span>
          </div>
        ))}
        {paws.map((paw) => (
          <div
            key={`paw-${paw.id}`}
            className="absolute animate-paw-float opacity-10"
            style={{
              left: paw.left,
              top: paw.top,
              animationDelay: paw.delay,
            }}
          >
            🐾
          </div>
        ))}
      </div>
    </>
  );
}
