import React from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Activity,
  Box,
  Wrench,
  MapPin,
  PlusCircle,
} from "lucide-react";

export function DockNav({ activePage = "dashboard", onNavigate }) {
  const navItems = [
    { id: "dashboard", label: "Operations Dashboard", icon: LayoutDashboard },
    { id: "intelligence", label: "Fleet Intelligence", icon: Activity },
    { id: "pack", label: "3D Cargo & Pack Layout", icon: Box },
    { id: "maintenance", label: "Predictive Maintenance", icon: Wrench },
    { id: "map", label: "Operations Map & Stations", icon: MapPin },
    { id: "addVehicle", label: "Add / Upload Vehicle", icon: PlusCircle },
  ];

  return (
    <aside className="fixed left-3 top-20 bottom-6 z-40 w-16 hidden md:flex flex-col items-center justify-between py-4 bg-[#0d1016]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)]">
      {/* Top Nav Items */}
      <div className="flex flex-col items-center gap-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activePage === item.id ||
            (item.id === "intelligence" &&
              (activePage === "fleet" || activePage === "realtime" || activePage === "analytics" || activePage === "prediction"));

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all ${
                isActive
                  ? "text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "text-slate-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {/* Active Background Pill with Motion */}
              {isActive && (
                <motion.div
                  layoutId="activeDockIndicator"
                  className="absolute inset-0 rounded-xl bg-amber-500 -z-10"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}

              <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />

              {/* Tooltip on Hover */}
              <div className="absolute left-16 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/10 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all shadow-xl z-50">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Status Dot */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
        <span className="text-[9px] font-mono text-slate-500 uppercase">LIVE</span>
      </div>
    </aside>
  );
}
