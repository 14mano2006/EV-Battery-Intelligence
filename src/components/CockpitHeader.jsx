import React from "react";
import { Search, Bell, Shield, Wifi, ChevronDown } from "lucide-react";

export function CockpitHeader({
  vehicles = [],
  selectedVehicle = "",
  onSelectVehicle,
  searchQuery = "",
  onSearchChange,
  alertCount = 2,
  onOpenAlerts,
}) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-5 py-3 bg-[#0d1016]/90 backdrop-blur-xl border-b border-white/[0.08] text-white">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.5)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#090d14" strokeWidth="2.5">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm tracking-wider uppercase text-white font-mono">VOLTIQ</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              OPS
            </span>
          </div>
          <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">EV Telemetry Suite</span>
        </div>
      </div>

      {/* Center: Live Vehicles Ticker Pills matching Video Frame 00:00 - 00:02 */}
      <div className="flex-1 max-w-2xl flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono shrink-0 hidden md:inline">
          Fleet:
        </span>
        {vehicles.slice(0, 6).map((vId, idx) => {
          const isSelected = vId === selectedVehicle;
          const isAlert = idx === 2; // simulated alert for variety

          return (
            <button
              key={vId}
              onClick={() => onSelectVehicle(vId)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition-all shrink-0 border ${
                isSelected
                  ? "bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] scale-105"
                  : isAlert
                  ? "bg-red-500/10 text-red-300 border-red-500/30 hover:bg-red-500/20"
                  : "bg-slate-900/80 text-slate-300 border-white/10 hover:border-slate-600 hover:text-white"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isSelected
                    ? "bg-slate-950"
                    : isAlert
                    ? "bg-red-400 animate-ping"
                    : "bg-emerald-400"
                }`}
              />
              <span>{vId}</span>
            </button>
          );
        })}
      </div>

      {/* Right Controls: Search, Telemetry Latency, Notifications, User */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Search */}
        <div className="relative hidden xl:block w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search telemetry..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400/80"
          />
        </div>

        {/* Live Ping indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-[11px] font-mono text-emerald-400">
          <Wifi className="w-3 h-3 text-emerald-400" />
          <span>18ms Live</span>
        </div>

        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          className="relative p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-slate-600 transition"
          title="System Notifications"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_#ef4444]">
              {alertCount}
            </span>
          )}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-white/10">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs font-mono">
            FC
          </div>
          <div className="hidden lg:block text-left leading-tight">
            <div className="text-xs font-semibold text-white">Commander</div>
            <div className="text-[10px] text-slate-400 font-mono">Operations</div>
          </div>
        </div>
      </div>
    </header>
  );
}
