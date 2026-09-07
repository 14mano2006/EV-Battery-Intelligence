import React, { useEffect, useState } from "react";

export function SpeedometerGauge({ value = 68, max = 120, unit = "mph", label = "Speed" }) {
  // Clamp value
  const clamped = Math.max(0, Math.min(max, value));
  // Angle: -120 deg to +120 deg (240 deg sweep)
  const angle = -120 + (clamped / max) * 240;

  // Arc calculation for SVG
  const radius = 64;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * radius;
  // Arc length is (240 / 360) * circumference
  const arcLength = (240 / 360) * circumference;
  const strokeDashoffset = arcLength - (clamped / max) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center p-3">
      <svg width="180" height="150" viewBox="0 0 180 150" className="overflow-visible">
        <defs>
          <linearGradient id="speedGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="65%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#1e2530"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(150 ${cx} ${cy})`}
        />

        {/* Active progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#speedGrad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(150 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          filter="url(#gaugeGlow)"
        />

        {/* Dial tick marks */}
        {[0, 20, 40, 60, 80, 100, 120].map((tickVal) => {
          const tickAngle = (-120 + (tickVal / max) * 240) * (Math.PI / 180);
          const x1 = cx + (radius - 12) * Math.sin(tickAngle);
          const y1 = cy - (radius - 12) * Math.cos(tickAngle);
          const x2 = cx + (radius - 4) * Math.sin(tickAngle);
          const y2 = cy - (radius - 4) * Math.cos(tickAngle);
          return (
            <line
              key={tickVal}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={tickVal <= clamped ? "#94a3b8" : "#334155"}
              strokeWidth={tickVal % 40 === 0 ? "2" : "1"}
            />
          );
        })}

        {/* Animated Needle */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius + 8}
            stroke="#f59e0b"
            strokeWidth="3"
            strokeLinecap="round"
            filter="drop-shadow(0 0 4px rgba(245, 158, 11, 0.8))"
          />
          <circle cx={cx} cy={cy} r="6" fill="#f59e0b" />
          <circle cx={cx} cy={cy} r="2.5" fill="#0f172a" />
        </g>
      </svg>

      {/* Digital readout */}
      <div className="text-center -mt-6">
        <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline justify-center gap-1">
          <span>{Math.round(clamped)}</span>
          <span className="text-xs text-amber-400 font-sans uppercase tracking-wider">{unit}</span>
        </div>
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export function EnergyDialGauge({ value = 78, max = 100, unit = "% SOH", label = "Battery SOH", color = "#10b981" }) {
  const clamped = Math.max(0, Math.min(max, value));
  const radius = 64;
  const cx = 90;
  const cy = 90;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (240 / 360) * circumference;
  const strokeDashoffset = arcLength - (clamped / max) * arcLength;

  return (
    <div className="relative flex flex-col items-center justify-center p-3">
      <svg width="180" height="150" viewBox="0 0 180 150" className="overflow-visible">
        <defs>
          <linearGradient id="sohGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="40%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#1e2530"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(150 ${cx} ${cy})`}
        />

        {/* Active progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color || "url(#sohGrad)"}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(150 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
          filter="drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))"
        />

        {/* Central Energy/Battery Icon */}
        <g transform={`translate(${cx - 12}, ${cy - 20})`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8">
            <rect x="2" y="7" width="16" height="10" rx="2" />
            <line x1="21" y1="10" x2="21" y2="14" strokeLinecap="round" />
            <line x1="6" y1="12" x2="12" y2="12" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </g>
      </svg>

      {/* Digital readout */}
      <div className="text-center -mt-6">
        <div className="text-2xl font-bold font-mono tracking-tight text-white flex items-baseline justify-center gap-1">
          <span>{typeof value === "number" ? value.toFixed(1) : value}</span>
          <span className="text-xs text-emerald-400 font-sans uppercase tracking-wider">{unit}</span>
        </div>
        <div className="text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">{label}</div>
      </div>
    </div>
  );
}
