import React, { useEffect, useState } from "react";

export function CompassWidget({ heading = 315, directionLabel = "NW" }) {
  // Add subtle gentle wandering to make it feel alive and tactical
  const [wobbleHeading, setWobbleHeading] = useState(heading);

  useEffect(() => {
    const timer = setInterval(() => {
      // gentle random oscillation +/- 1.5 deg
      const jitter = (Math.random() - 0.5) * 2;
      setWobbleHeading(heading + jitter);
    }, 1200);
    return () => clearInterval(timer);
  }, [heading]);

  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {/* Outer Glow Ring */}
      <div className="absolute inset-0 rounded-full border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.15)] pointer-events-none" />

      {/* Rotating Dial Ring */}
      <svg
        width="112"
        height="112"
        viewBox="0 0 112 112"
        className="transition-transform duration-700 ease-out overflow-visible"
        style={{ transform: `rotate(${-wobbleHeading}deg)` }}
      >
        <circle cx="56" cy="56" r="50" fill="#0d1117" stroke="#222c3a" strokeWidth="1.5" />
        
        {/* Cardinal tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const deg = i * 10;
          const rad = (deg * Math.PI) / 180;
          const isMajor = deg % 90 === 0;
          const isMedium = deg % 30 === 0;
          const r1 = isMajor ? 38 : isMedium ? 42 : 45;
          const r2 = 49;
          const x1 = 56 + r1 * Math.sin(rad);
          const y1 = 56 - r1 * Math.cos(rad);
          const x2 = 56 + r2 * Math.sin(rad);
          const y2 = 56 - r2 * Math.cos(rad);
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={isMajor ? "#f59e0b" : isMedium ? "#64748b" : "#334155"}
              strokeWidth={isMajor ? "1.8" : "1"}
            />
          );
        })}

        {/* Cardinal Letters */}
        <text x="56" y="24" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold" fontFamily="sans-serif">N</text>
        <text x="92" y="59" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">E</text>
        <text x="56" y="94" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">S</text>
        <text x="20" y="59" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" fontFamily="sans-serif">W</text>
      </svg>

      {/* Static Reticle / Aircraft Needle in the center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {/* Reticle Crosshair */}
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]" />
        
        {/* Direction Indicator Badge */}
        <div className="absolute -bottom-2 bg-slate-900/90 border border-slate-700/80 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-amber-300 shadow">
          {Math.round(wobbleHeading)}° {directionLabel}
        </div>
      </div>
    </div>
  );
}
