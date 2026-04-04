import { useMemo } from "react";

export function AnimatedBackground() {
  const coins = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${8 + Math.random() * 6}s`,
      size: 16 + Math.random() * 16,
    })), []
  );

  const paws = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      left: `${10 + Math.random() * 80}%`,
      top: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 5}s`,
    })), []
  );

  return (
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
          <span style={{ fontSize: coin.size }} className="opacity-20">🪙</span>
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
  );
}
