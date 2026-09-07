import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Layers,
  Box,
  Eye,
  Thermometer,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Play,
  Pause,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Compass,
  Radio,
  Clock,
} from "lucide-react";

export function BatteryPack3D({
  selectedVehicle = "EV-9913-HX",
  battery = {},
  currentSOH = 88.4,
  rul = null,
  loadingRul = false,
  onNavigateToMap,
  onNavigateToPrediction,
}) {
  // Viewpoints: "3d" (Isometric) | "top" (Top Deck) | "side" (Lateral) | "gullwing" (Open Bay) | "thermal" (Heatmap)
  const [viewMode, setViewMode] = useState("3d");
  const [selectedModuleId, setSelectedModuleId] = useState("BAT-8841");
  const [isOrbiting, setIsOrbiting] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1.0); // 0.85 (wide), 1.0 (normal), 1.25 (close)
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [isBooting, setIsBooting] = useState(true);
  const [bootStep, setBootStep] = useState(0);
  const [orbitAngle, setOrbitAngle] = useState(0);

  // Check user prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsOrbiting(false);
    }
  }, []);

  // Digital Twin Boot Sequence on mount
  useEffect(() => {
    const t1 = setTimeout(() => setBootStep(1), 400);
    const t2 = setTimeout(() => setBootStep(2), 900);
    const t3 = setTimeout(() => setBootStep(3), 1400);
    const t4 = setTimeout(() => setIsBooting(false), 1900);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  // Continuous slow camera orbit animation (video-like digital twin movement)
  useEffect(() => {
    if (!isOrbiting || viewMode !== "3d") return;

    let frameId;
    let start = performance.now();

    const loop = (now) => {
      const elapsed = (now - start) / 1000;
      // Gentle sinusoidal yaw (-16 to 16 deg) and tilt (22 to 26 deg)
      setOrbitAngle(elapsed);
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isOrbiting, viewMode]);

  // Derived camera rotations based on viewpoint and orbit
  const getCameraTransform = () => {
    if (viewMode === "top") {
      return { rotateX: 0, rotateY: 0, rotateZ: 0, scale: zoomLevel * 0.95 };
    }
    if (viewMode === "side") {
      return { rotateX: 5, rotateY: -85, rotateZ: 0, scale: zoomLevel * 0.9 };
    }
    if (viewMode === "gullwing") {
      return { rotateX: 32, rotateY: -35, rotateZ: 8, scale: zoomLevel * 1.05 };
    }
    if (viewMode === "thermal") {
      return { rotateX: 18, rotateY: -15, rotateZ: 2, scale: zoomLevel };
    }
    // Default 3D Isometric with gentle camera orbit
    const yawOffset = isOrbiting ? Math.sin(orbitAngle * 0.4) * 8 : -14;
    const pitchOffset = isOrbiting ? 24 + Math.cos(orbitAngle * 0.3) * 2 : 24;
    return {
      rotateX: pitchOffset,
      rotateY: yawOffset,
      rotateZ: isOrbiting ? Math.sin(orbitAngle * 0.35) * 1.5 : 2,
      scale: zoomLevel,
    };
  };

  // Modular battery blocks mapped from active vehicle SOH
  const baseSoh = Number.isFinite(currentSOH) ? currentSOH : 88.4;
  const modules = [
    {
      id: "BAT-8841",
      name: "Module A1 - High Energy Array",
      cells: 120,
      soh: Math.min(100, +(baseSoh + 1.2).toFixed(1)),
      temp: 29.4,
      voltage: 48.2,
      capacity: 4.8,
      status: "optimal",
      riskScore: 12,
      priority: "#01",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-8841-A",
      weight: "128 kg",
    },
    {
      id: "BAT-4574",
      name: "Module A2 - Fast Discharge Unit",
      cells: 120,
      soh: Math.min(100, +(baseSoh - 0.8).toFixed(1)),
      temp: 31.8,
      voltage: 48.0,
      capacity: 4.6,
      status: "normal",
      riskScore: 18,
      priority: "#02",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-4574-A",
      weight: "128 kg",
    },
    {
      id: "BAT-2391",
      name: "Module B1 - High Voltage Core",
      cells: 120,
      soh: Math.min(100, +(baseSoh + 0.4).toFixed(1)),
      temp: 28.6,
      voltage: 48.3,
      capacity: 4.9,
      status: "optimal",
      riskScore: 9,
      priority: "#03",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-2391-B",
      weight: "128 kg",
    },
    {
      id: "BAT-7801",
      name: "Module B2 - Thermal Balanced Cell",
      cells: 120,
      soh: Math.min(100, +(baseSoh - 4.2).toFixed(1)),
      temp: 37.2,
      voltage: 47.4,
      capacity: 4.2,
      status: baseSoh < 75 ? "degraded" : "monitor",
      riskScore: 42,
      priority: "#04",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-7801-B",
      weight: "128 kg",
    },
    {
      id: "BAT-1268",
      name: "Module C1 - Heavy Cycle Unit",
      cells: 120,
      soh: Math.min(100, +(baseSoh - 1.5).toFixed(1)),
      temp: 30.5,
      voltage: 48.1,
      capacity: 4.5,
      status: "normal",
      riskScore: 22,
      priority: "#05",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-1268-C",
      weight: "128 kg",
    },
    {
      id: "BAT-5978",
      name: "Module C2 - Precision Balanced",
      cells: 120,
      soh: Math.min(100, +(baseSoh + 0.9).toFixed(1)),
      temp: 27.8,
      voltage: 48.4,
      capacity: 4.8,
      status: "optimal",
      riskScore: 11,
      priority: "#06",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-5978-C",
      weight: "128 kg",
    },
    {
      id: "BAT-9014",
      name: "Module D1 - Auxiliary Booster",
      cells: 120,
      soh: Math.min(100, +(baseSoh - 2.1).toFixed(1)),
      temp: 34.0,
      voltage: 47.8,
      capacity: 4.4,
      status: "normal",
      riskScore: 26,
      priority: "#07",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-9014-D",
      weight: "128 kg",
    },
    {
      id: "BAT-3419",
      name: "Module D2 - Redundant Safety Pack",
      cells: 120,
      soh: Math.min(100, +(baseSoh - 0.5).toFixed(1)),
      temp: 29.1,
      voltage: 48.2,
      capacity: 4.7,
      status: "optimal",
      riskScore: 14,
      priority: "#08",
      chemistry: "NMC 811 Lithium",
      serial: "VOLT-CATL-3419-D",
      weight: "128 kg",
    },
  ];

  const activeModule = modules.find((m) => m.id === selectedModuleId) || modules[0];

  const getStatusColor = (status) => {
    switch (status) {
      case "optimal":
        return { text: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.35)", label: "Optimal" };
      case "normal":
        return { text: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)", border: "rgba(56, 189, 248, 0.35)", label: "Normal" };
      case "monitor":
        return { text: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)", border: "rgba(245, 158, 11, 0.35)", label: "Check Temp" };
      case "degraded":
        return { text: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", border: "rgba(239, 68, 68, 0.35)", label: "Degraded" };
      default:
        return { text: "#94a3b8", bg: "rgba(148, 163, 184, 0.15)", border: "rgba(148, 163, 184, 0.35)", label: "Active" };
    }
  };

  const cameraTransform = getCameraTransform();

  return (
    <div className="flex flex-col gap-5 w-full text-slate-100">
      {/* ============================================================
          TOP CONTROLS & DIGITAL TWIN STATUS BAR
          ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">3D Cargo &amp; Pack Digital Twin</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                {selectedVehicle}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-white/10 text-[11px] font-mono text-cyan-300">
                <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
                800V CAN BUS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Kinematic chassis bay, modular pack telemetry &amp; volumetric thermal inspection
            </p>
          </div>
        </div>

        {/* Viewpoint Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/10 text-xs">
          <button
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "3d"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            Isometric 3D
          </button>
          <button
            onClick={() => setViewMode("top")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "top"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Top Deck
          </button>
          <button
            onClick={() => setViewMode("gullwing")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "gullwing"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Gullwing Bay
          </button>
          <button
            onClick={() => setViewMode("thermal")}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
              viewMode === "thermal"
                ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Thermometer className="w-3.5 h-3.5" />
            Thermal Heatmap
          </button>
        </div>
      </div>

      {/* ============================================================
          MAIN 3D STAGE & MODULE DIAGNOSTICS DRAWER
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* 3D STAGE (Span 8) */}
        <div className="lg:col-span-8 flex flex-col gap-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 overflow-hidden relative min-h-[620px] shadow-2xl">
          {/* Stage HUD Overlay Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10 z-20">
            {/* Volume Utilization Meter */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-mono">Cargo Bay Vol:</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-mono font-bold text-xs">2,500 / 2,800 kWh</span>
                <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                  89.3% Utilized
                </span>
              </div>
            </div>

            {/* Video-like Animation & Camera Controls */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10">
              {/* Orbit Play / Pause button */}
              <button
                onClick={() => setIsOrbiting(!isOrbiting)}
                title={isOrbiting ? "Pause Camera Orbit" : "Resume Camera Orbit"}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-medium transition ${
                  isOrbiting
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {isOrbiting ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline">{isOrbiting ? "Orbit Active" : "Orbit Paused"}</span>
              </button>

              {/* Data Flow Toggle */}
              <button
                onClick={() => setShowDataFlow(!showDataFlow)}
                title="Toggle Energy & Data Flow Pathways"
                className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition ${
                  showDataFlow
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Zap className="w-3 h-3" />
              </button>

              {/* Zoom Buttons */}
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.75, +(z - 0.15).toFixed(2)))}
                title="Zoom Out"
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-400 px-1">{zoomLevel}x</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.35, +(z + 0.15).toFixed(2)))}
                title="Zoom In"
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Isometric Viewport Container */}
          <div
            className="relative flex-1 w-full rounded-xl overflow-hidden flex items-center justify-center p-4 transition-all"
            style={{ minHeight: "480px", perspective: "1400px" }}
          >
            {/* Ambient Background Grid & Radar Sweep */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(245,158,11,0.18) 0%, transparent 70%),
                  linear-gradient(to right, #1e293b 1px, transparent 1px),
                  linear-gradient(to bottom, #1e293b 1px, transparent 1px)`,
                backgroundSize: "100% 100%, 32px 32px, 32px 32px",
              }}
            />

            {/* Subtle Radar Sweep Circle */}
            <div className="absolute w-[440px] h-[440px] rounded-full border border-slate-700/40 pointer-events-none flex items-center justify-center">
              <div className="w-[320px] h-[320px] rounded-full border border-amber-500/10" />
              <div className="w-[180px] h-[180px] rounded-full border border-cyan-500/10" />
            </div>

            {/* Animated Boot Sequence Overlay */}
            <AnimatePresence>
              {isBooting && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
                    <Box className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-white tracking-wider font-mono uppercase">
                    Initializing Digital Twin
                  </h3>
                  <div className="space-y-1.5 mt-3 text-xs font-mono text-slate-400">
                    <p className={bootStep >= 1 ? "text-emerald-400" : "text-slate-600"}>
                      ✓ Volumetric chassis mesh calibrated
                    </p>
                    <p className={bootStep >= 2 ? "text-cyan-400" : "text-slate-600"}>
                      ✓ 8 Modular battery pack telemetry synced
                    </p>
                    <p className={bootStep >= 3 ? "text-amber-400" : "text-slate-600"}>
                      ✓ 800V High-Voltage CAN-Bus linked
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 3D TRUCK & CHASSIS STAGE */}
            <motion.div
              animate={{
                rotateX: cameraTransform.rotateX,
                rotateY: cameraTransform.rotateY,
                rotateZ: cameraTransform.rotateZ,
                scale: cameraTransform.scale,
              }}
              transition={{
                type: isOrbiting ? "tween" : "spring",
                duration: isOrbiting ? 0.05 : 0.6,
                ease: "linear",
              }}
              className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-[#0b0e14] border border-slate-700/80 rounded-2xl p-6 shadow-2xl"
              style={{
                transformStyle: "preserve-3d",
                boxShadow: "0 30px 70px -15px rgba(0,0,0,0.9), 0 0 40px rgba(245,158,11,0.1)",
              }}
            >
              {/* Truck Cab / Chassis Outline Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <svg width="34" height="24" viewBox="0 0 36 24" fill="none" className="text-amber-400">
                    <path d="M2 18V6a2 2 0 012-2h18v14H4a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" />
                    <path d="M22 8h7l4 5v5h-11V8z" stroke="currentColor" strokeWidth="2" />
                    <circle cx="8" cy="18" r="3" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
                    <circle cx="28" cy="18" r="3" fill="#0f172a" stroke="currentColor" strokeWidth="2" />
                  </svg>
                  <div>
                    <div className="text-xs font-mono font-bold text-white tracking-wide">
                      CHASSIS BAY: {selectedVehicle}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      800V ARCHITECTURE · LOW-CENTER BATTERY TRAY
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] text-slate-300 font-mono">CAN LINK: NOMINAL</span>
                </div>
              </div>

              {/* Animated Energy & Data Flow Pathway SVG Overlay */}
              {showDataFlow && (
                <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                  <svg className="w-full h-full opacity-40">
                    {/* Spine Bus Line */}
                    <line
                      x1="10%"
                      y1="50%"
                      x2="90%"
                      y2="50%"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                    {/* Vertical Module Branch lines */}
                    <line x1="25%" y1="25%" x2="25%" y2="75%" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                    <line x1="50%" y1="25%" x2="50%" y2="75%" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                    <line x1="75%" y1="25%" x2="75%" y2="75%" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
                  </svg>
                </div>
              )}

              {/* Modular Battery Rack (2 rows of 4 modules) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
                {modules.map((m) => {
                  const isSelected = m.id === selectedModuleId;
                  const sc = getStatusColor(m.status);

                  return (
                    <motion.div
                      key={m.id}
                      whileHover={{ scale: 1.05, y: -4 }}
                      onClick={() => setSelectedModuleId(m.id)}
                      className={`relative flex flex-col justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-slate-800/95 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.4)] ring-1 ring-amber-400"
                          : viewMode === "thermal"
                          ? m.temp > 35
                            ? "bg-red-950/40 border-red-500/50"
                            : m.temp > 30
                            ? "bg-amber-950/40 border-amber-500/40"
                            : "bg-cyan-950/40 border-cyan-500/40"
                          : "bg-slate-900/80 border-slate-700/60 hover:border-slate-500"
                      }`}
                      style={{ minHeight: "120px", transformStyle: "preserve-3d" }}
                    >
                      {/* Top row: Module ID + Status Pill */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-white tracking-wide">{m.id}</span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ color: sc.text, backgroundColor: sc.bg, border: `1px solid ${sc.border}` }}
                        >
                          {sc.label}
                        </span>
                      </div>

                      {/* Middle: Micro metrics */}
                      <div className="my-1.5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>{m.voltage}V</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Thermometer className="w-3 h-3 text-cyan-400" />
                          <span className={m.temp > 35 ? "text-red-400 font-bold" : ""}>{m.temp}°C</span>
                        </div>
                      </div>

                      {/* SOH Progress Bar */}
                      <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${m.soh}%`,
                            backgroundColor:
                              m.soh >= 80 ? "#10b981" : m.soh >= 60 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>

                      {/* Footer: SOH readout */}
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-mono">
                        <span>Health Index</span>
                        <strong className="text-slate-200">{m.soh}%</strong>
                      </div>

                      {/* Selected Neon Corner Indicator & Bracket Glow */}
                      {isSelected && (
                        <>
                          <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping" />
                          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-amber-400" />
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-amber-400" />
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom Tray & Status */}
              <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-3 font-mono">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 8 / 8 Units Online
                  </span>
                  <span className="hidden sm:inline">THERMAL SENSORS: BALANCED</span>
                </div>
                <div className="text-xs text-amber-400/90 font-medium">Click any module to inspect</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* RIGHT: Module Diagnostics Drawer (Span 4) */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-900/85 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">Module Diagnostics</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Slot {activeModule.priority}</span>
          </div>

          {/* Active Module Card */}
          <div className="bg-slate-950/80 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-amber-400 tracking-wider">
                  {activeModule.id}
                </div>
                <h4 className="text-sm font-semibold text-white mt-0.5">{activeModule.name}</h4>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">{activeModule.serial}</div>
              </div>

              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  color: getStatusColor(activeModule.status).text,
                  backgroundColor: getStatusColor(activeModule.status).bg,
                  border: `1px solid ${getStatusColor(activeModule.status).border}`,
                }}
              >
                {getStatusColor(activeModule.status).label}
              </span>
            </div>

            {/* Spec Matrix Grid */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5 text-xs">
              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Module Health</span>
                <strong className="text-white font-mono text-base">{activeModule.soh}%</strong>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Temperature</span>
                <strong className="text-cyan-400 font-mono text-base">{activeModule.temp} °C</strong>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Cell Voltage</span>
                <strong className="text-white font-mono text-base">{activeModule.voltage} V</strong>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Risk Factor</span>
                <strong className="text-amber-400 font-mono text-base">{activeModule.riskScore}%</strong>
              </div>
            </div>

            {/* Chemistry & Cell Count Details */}
            <div className="space-y-1.5 text-[11px] text-slate-300 font-mono pt-2 border-t border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-500">Chemistry:</span>
                <span>{activeModule.chemistry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cell Array:</span>
                <span>{activeModule.cells}s1p Prismatic</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Net Weight:</span>
                <span>{activeModule.weight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capacity Rating:</span>
                <span>{activeModule.capacity} kWh</span>
              </div>
            </div>

            {/* High Voltage Enclosure Callout */}
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <strong className="font-semibold block">800V High-Voltage Safety Enclosure</strong>
                <span className="text-[11px] text-amber-300/80">
                  Active thermal management within nominal threshold.
                </span>
              </div>
            </div>

            {/* Lifetime RUL Prognostics Callout */}
            <div className="bg-slate-900/90 border border-amber-500/25 rounded-xl p-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pack Lifetime RUL</span>
                </div>
                <span className="text-[10px] text-slate-400">Target 70% SOH</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
                  <span className="text-slate-500 block text-[10px]">Remaining Cycles</span>
                  <strong className="text-white font-bold text-sm">
                    {rul?.remaining_useful_life_cycles ?? 412} cyc
                  </strong>
                </div>
                <div className="bg-slate-950/70 p-2 rounded-lg border border-white/5">
                  <span className="text-slate-500 block text-[10px]">Est. Range Left</span>
                  <strong className="text-emerald-400 font-bold text-sm">
                    {rul?.estimated_remaining_km ? `${Math.round(rul.estimated_remaining_km / 1000)}k km` : "~156k km"}
                  </strong>
                </div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-white/5">
                <span>Retirement Horizon:</span>
                <span className="text-amber-300 font-bold">{rul?.estimated_eol_date || "Nov 2027"}</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
                  style={{ width: `${rul?.lifecycle_remaining_percent != null ? rul.lifecycle_remaining_percent : 58.2}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={onNavigateToMap}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:scale-[1.01]"
            >
              <ArrowUpRight className="w-4 h-4" />
              Route to Fast Charging Hub
            </button>

            <button
              onClick={onNavigateToPrediction}
              className="flex items-center justify-center gap-2 w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white font-semibold text-xs tracking-wide transition hover:scale-[1.01]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Inspect Degradation Curve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
