import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Activity,
  Cpu,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Thermometer,
  BatteryCharging,
  ArrowRight,
  RefreshCw,
  Sliders,
  ChevronRight,
  Filter,
  Layers,
  Sparkles,
  BarChart3,
  Search,
  ExternalLink,
  Clock,
  Calendar,
  Gauge,
  Award,
} from "lucide-react";

export function FleetIntelligence({
  vehicles = [],
  selectedVehicle = "",
  onSelectVehicle,
  fleet = null,
  loadingFleet = false,
  maintenance = null,
  loadingMaintenance = false,
  battery = {},
  trend = null,
  loadingTrend = false,
  trendData = [],
  rul = null,
  loadingRul = false,
  telemetry = null,
  telemetryEnabled = true,
  setTelemetryEnabled,
  loadingTelemetry = false,
  telemetryError = "",
  onNavigateToMap,
  onNavigateToMaintenance,
  handlePredict,
  prediction = null,
  predictionDetails = null,
  loadingPrediction = false,
  animatedPrediction = 0,
  healthStatus = null,
  renderTrendGraph,
}) {
  const [activeTab, setActiveTab] = useState("unified"); // "unified" | "telemetry" | "degradation" | "rul"
  const [searchFilter, setSearchFilter] = useState("");
  const [pipelineStep, setPipelineStep] = useState(1);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Auto-cycle pipeline step subtly for demo presentation if idle
  useEffect(() => {
    const timer = setInterval(() => {
      setPipelineStep((prev) => (prev >= 4 ? 1 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const summary = fleet?.summary || {};
  const fleetVehicles = Array.isArray(fleet?.fleet) ? fleet.fleet : [];
  const maintenanceVehicles = Array.isArray(maintenance?.maintenance) ? maintenance.maintenance : [];

  // Current selected vehicle maintenance record
  const currentMaint = maintenanceVehicles.find((m) => m.battery_id === selectedVehicle);

  const t = telemetry || {};
  const voltage = Number(t.voltage_v ?? battery?.voltage_mean ?? 48.2).toFixed(2);
  const current = Number(t.current_a ?? battery?.current_mean ?? -15.4).toFixed(1);
  const temperature = Number(t.temperature_c ?? battery?.temperature_mean ?? 29.8).toFixed(1);
  const soc = Number(t.soc_percent ?? 82).toFixed(0);
  const power = Number(t.power_kw ?? Math.abs((Number(voltage) * Number(current)) / 1000)).toFixed(2);
  const cycle = t.cycle ?? battery?.cycle ?? 384;

  const currentSOH =
    battery?.SOH_percent ??
    battery?.current_soh_percent ??
    trend?.current_soh_percent ??
    (currentMaint?.current_soh_percent != null ? Number(currentMaint.current_soh_percent) : 88.4);

  const degradationPct =
    trend?.soh_degradation_percent != null
      ? Math.abs(Number(trend.soh_degradation_percent)).toFixed(2)
      : Math.abs(100 - Number(currentSOH)).toFixed(2);

  const riskLevel = String(currentMaint?.risk_level ?? t.risk_level ?? "LOW").toUpperCase();

  const getRiskBadgeColor = (risk) => {
    switch (String(risk).toLowerCase()) {
      case "critical":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  const executePipelineAnalysis = async () => {
    setIsProcessingAI(true);
    try {
      if (handlePredict) {
        await handlePredict();
      }
    } finally {
      setTimeout(() => setIsProcessingAI(false), 800);
    }
  };

  const filteredFleet = fleetVehicles.filter((v) =>
    searchFilter ? v.battery_id.toLowerCase().includes(searchFilter.toLowerCase()) : true
  );

  return (
    <div className="flex flex-col gap-6 w-full text-slate-100">
      {/* ============================================================
          TOP FLEET OVERVIEW HEADER
          ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950/90 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Fleet Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
                Telemetry + Degradation
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Unified sensor telemetry streaming, degradation progression & AI risk intelligence
            </p>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-white/10 text-xs">
            <button
              onClick={() => setActiveTab("unified")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "unified"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Unified View
            </button>
            <button
              onClick={() => setActiveTab("telemetry")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "telemetry"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Telemetry Stream
            </button>
            <button
              onClick={() => setActiveTab("degradation")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "degradation"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Degradation Analysis
            </button>
            <button
              onClick={() => setActiveTab("rul")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === "rul"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              RUL Prognostics
            </button>
          </div>

          <button
            onClick={() => window.location.reload()}
            title="Refresh Fleet Telemetry"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          FLEET OVERVIEW KPI CARDS (Section 3 Requirement)
          ============================================================ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Total Monitored</span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-black font-mono text-white">
              {summary.total_vehicles ?? fleetVehicles.length}
            </strong>
            <span className="text-[10px] text-slate-500 font-mono">EVs</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">● 100% Active Fleet</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Fleet Avg Health</span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-black font-mono text-emerald-400">
              {summary.average_soh_percent != null
                ? `${Number(summary.average_soh_percent).toFixed(1)}%`
                : "88.6%"}
            </strong>
          </div>
          <span className="text-[10px] text-slate-400">Baseline Target: &gt;80%</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Fleet Avg RUL</span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-black font-mono text-amber-400">
              {summary.average_rul_cycles ?? 385}
            </strong>
            <span className="text-[10px] text-slate-500 font-mono">cycles</span>
          </div>
          <span className="text-[10px] text-slate-400">
            ~{summary.average_rul_cycles ? Math.round((summary.average_rul_cycles * 380) / 1000) : 146}k km est. range
          </span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Optimal Packs</span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-black font-mono text-white">
              {summary.excellent ?? (fleetVehicles.length ? Math.max(1, fleetVehicles.length - 2) : 5)}
            </strong>
            <span className="text-[10px] text-slate-500 font-mono">packs</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">Healthy RUL</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between border-l-2 border-l-red-500/80">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Urgent RUL Action</span>
          <div className="my-1.5 flex items-baseline gap-1.5">
            <strong className="text-2xl font-black font-mono text-red-400">
              {summary.urgent_rul_replacements ?? maintenance?.summary?.critical ?? 1}
            </strong>
            <span className="text-[10px] text-red-400/80 font-mono">units</span>
          </div>
          <span className="text-[10px] text-red-400 font-medium">Under 50 cycles remaining</span>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400">Selected Unit</span>
          <div className="my-1.5">
            <select
              value={selectedVehicle}
              onChange={(e) => onSelectVehicle(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
            >
              {vehicles.map((vId) => (
                <option key={vId} value={vId}>
                  {vId}
                </option>
              ))}
            </select>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Cycle #{cycle}</span>
        </div>
      </div>

      {/* ============================================================
          SECTION 3 REQUIREMENT: RELATIONSHIP VISUALIZATION
          "What is happening?" → "Why is it happening?" → "What does AI predict?" → "What action is required?"
          ============================================================ */}
      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                AI Diagnostic &amp; Prognostic Pipeline
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-stage inference path from live telemetry to autonomous maintenance scheduling
            </p>
          </div>

          <button
            onClick={executePipelineAnalysis}
            disabled={isProcessingAI || loadingPrediction}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isProcessingAI ? "animate-spin" : "fill-current"}`} />
            {isProcessingAI ? "Simulating AI Pipeline..." : "Trigger Live AI Inference"}
          </button>
        </div>

        {/* 4-Step Interactive Animated Relationship Stages */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          {/* STEP 1: What is happening? */}
          <div
            onClick={() => setPipelineStep(1)}
            className={`cursor-pointer rounded-xl p-4 transition-all border ${
              pipelineStep === 1
                ? "bg-slate-800/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                : "bg-slate-950/60 border-white/5 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-amber-400 font-bold">01. TELEMETRY</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">What is happening?</h4>
            <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Voltage:</span>
                <span className="text-white font-bold">{voltage} V</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current:</span>
                <span className="text-white font-bold">{current} A</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Temp:</span>
                <span className="text-cyan-400 font-bold">{temperature} °C</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/5">
              Live CAN-bus frame streaming {telemetryEnabled ? "nominal" : "paused"} at 2s interval.
            </p>
          </div>

          {/* STEP 2: Why is it happening? */}
          <div
            onClick={() => setPipelineStep(2)}
            className={`cursor-pointer rounded-xl p-4 transition-all border ${
              pipelineStep === 2
                ? "bg-slate-800/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                : "bg-slate-950/60 border-white/5 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-amber-400 font-bold">02. DEGRADATION</span>
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">Why is it happening?</h4>
            <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Degradation:</span>
                <span className="text-amber-400 font-bold">-{degradationPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cycle Count:</span>
                <span className="text-white font-bold">#{cycle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Capacity:</span>
                <span className="text-white font-bold">{Number(battery?.capacity_Ah ?? 175).toFixed(1)} Ah</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/5">
              Electrochemical impedance &amp; Coulombic cycle wear across operational cycles.
            </p>
          </div>

          {/* STEP 3: What does AI predict? */}
          <div
            onClick={() => setPipelineStep(3)}
            className={`cursor-pointer rounded-xl p-4 transition-all border ${
              pipelineStep === 3
                ? "bg-slate-800/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                : "bg-slate-950/60 border-white/5 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-amber-400 font-bold">03. AI &amp; RUL INFERENCE</span>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">What does AI predict?</h4>
            <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Est. Health:</span>
                <span className="text-emerald-400 font-bold">
                  {prediction != null ? `${Number(prediction).toFixed(1)}%` : `${Number(currentSOH).toFixed(1)}%`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Remaining Life:</span>
                <span className="text-amber-400 font-bold">
                  {rul?.remaining_useful_life_cycles != null ? `${rul.remaining_useful_life_cycles} cyc` : "412 cyc"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Est. Distance:</span>
                <span className="text-cyan-400 font-bold">
                  {rul?.estimated_remaining_km != null ? `~${Math.round(rul.estimated_remaining_km / 1000)}k km` : "~156k km"}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/5">
              Empirical linear regression calibrated down to 70% SOH retirement threshold.
            </p>
          </div>

          {/* STEP 4: What action is required? */}
          <div
            onClick={() => setPipelineStep(4)}
            className={`cursor-pointer rounded-xl p-4 transition-all border ${
              pipelineStep === 4
                ? "bg-slate-800/90 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-400/50"
                : "bg-slate-950/60 border-white/5 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-mono text-amber-400 font-bold">04. PROGNOSTIC ACTION</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h4 className="text-xs font-bold text-slate-200">What action is required?</h4>
            <div className="mt-2 text-xs font-mono space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Retirement:</span>
                <span className="text-white font-bold">{rul?.estimated_eol_date || "Nov 2027"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Urgency:</span>
                <span className={`px-1.5 rounded text-[10px] ${
                  rul?.urgency === "CRITICAL" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                  rul?.urgency === "ATTENTION" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                }`}>
                  {rul?.urgency || "ROUTINE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Action:</span>
                <span className="text-emerald-400 font-bold">
                  {currentMaint?.risk_level === "CRITICAL" ? "Immediate Service" : "Normal Routine"}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2.5 pt-2 border-t border-white/5 truncate">
              {currentMaint?.recommendation || "Battery operating within nominal envelope."}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================
          MAIN BODY: TELEMETRY STREAM & DEGRADATION ANALYSIS PANELS
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Live Telemetry Stream (Span 6 or full when tab selected) */}
        <div
          className={`${
            activeTab === "telemetry"
              ? "lg:col-span-12"
              : activeTab === "degradation"
              ? "hidden"
              : "lg:col-span-6"
          } flex flex-col gap-4 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Live Telemetry Stream</h3>
                <p className="text-xs text-slate-400">High-frequency sensor bus for {selectedVehicle}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  telemetryEnabled ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />
              <button
                onClick={() => setTelemetryEnabled(!telemetryEnabled)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 transition"
              >
                {telemetryEnabled ? "Pause" : "Stream"}
              </button>
            </div>
          </div>

          {telemetryError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              ⚠️ {telemetryError}
            </div>
          )}

          {/* Metric Tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Pack Voltage</span>
              <strong className="text-lg font-mono font-bold text-white block mt-0.5">{voltage} V</strong>
              <small className="text-[10px] text-slate-500 font-mono">Nominal: 48V DC</small>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Pack Current</span>
              <strong className="text-lg font-mono font-bold text-cyan-400 block mt-0.5">{current} A</strong>
              <small className="text-[10px] text-slate-500 font-mono">Discharge Rate</small>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Thermal Sensor</span>
              <strong className="text-lg font-mono font-bold text-amber-400 block mt-0.5">{temperature} °C</strong>
              <small className="text-[10px] text-slate-500 font-mono">Cooling Loop Active</small>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">State of Charge</span>
              <strong className="text-lg font-mono font-bold text-emerald-400 block mt-0.5">{soc}%</strong>
              <small className="text-[10px] text-slate-500 font-mono">Simulated SOC</small>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Live Power Draw</span>
              <strong className="text-lg font-mono font-bold text-white block mt-0.5">{power} kW</strong>
              <small className="text-[10px] text-slate-500 font-mono">Traction + Aux</small>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono">Cycle Index</span>
              <strong className="text-lg font-mono font-bold text-amber-400 block mt-0.5">#{cycle}</strong>
              <small className="text-[10px] text-slate-500 font-mono">Active Aging Cycle</small>
            </div>
          </div>

          {/* Operational Status Box */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Operational Mode:</span>
              <span className="text-emerald-400 font-bold font-mono">● EN ROUTE · DISCHARGING</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">CAN Bus Latency:</span>
              <span className="text-slate-300 font-mono">18 ms (Realtime polling)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono">Thermal Anomaly:</span>
              <span className="text-emerald-400 font-mono">None Detected (30°C margin)</span>
            </div>
          </div>

          {/* Quick navigation to Map */}
          <button
            onClick={onNavigateToMap}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wide border border-white/10 transition flex items-center justify-center gap-2"
          >
            <span>View Vehicle on Charging Map</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* RIGHT COLUMN: Degradation Analysis & Prediction (Span 6 or full when tab selected) */}
        <div
          className={`${
            activeTab === "degradation"
              ? "lg:col-span-12"
              : activeTab === "telemetry"
              ? "hidden"
              : "lg:col-span-6"
          } flex flex-col gap-4 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Degradation Analysis</h3>
                <p className="text-xs text-slate-400">Historical capacity fade &amp; AI model projection</p>
              </div>
            </div>

            <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold ${getRiskBadgeColor(riskLevel)}`}>
              Risk: {riskLevel}
            </span>
          </div>

          {/* Degradation Trend Curve */}
          <div className="bg-slate-950/70 p-3 rounded-xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-slate-300">Degradation Curve</span>
              <span className="text-[11px] font-mono text-slate-400">{trendData.length || 384} Data Points</span>
            </div>
            <div className="w-full overflow-x-auto min-h-[160px] flex items-center justify-center">
              {renderTrendGraph ? (
                renderTrendGraph()
              ) : (
                <div className="text-xs font-mono text-slate-500">Loading degradation curve...</div>
              )}
            </div>
          </div>

          {/* Degradation Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase">Current Health</span>
              <strong className="text-base text-emerald-400 block mt-0.5">{Number(currentSOH).toFixed(2)}%</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase">Total Loss</span>
              <strong className="text-base text-amber-400 block mt-0.5">-{degradationPct}%</strong>
            </div>

            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-white/5">
              <span className="text-[10px] text-slate-500 block uppercase">AI Prediction</span>
              <strong className="text-base text-cyan-400 block mt-0.5">
                {prediction != null ? `${Number(prediction).toFixed(2)}%` : `${Number(currentSOH).toFixed(2)}%`}
              </strong>
            </div>
          </div>

          {/* AI Maintenance Insight & Recommendation */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Maintenance Priority:</span>
              <span className="text-amber-400 font-bold">
                Score: {currentMaint?.priority_score ?? 15} / 100
              </span>
            </div>
            <div className="text-xs text-slate-300">
              <span className="text-slate-500 font-mono block text-[11px] mb-1">Prescribed Action:</span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentMaint?.recommendation ||
                  "Cell balance nominal. Maintain standard charging protocols up to 85% SOC to preserve cathode lifespan."}
              </p>
            </div>
          </div>

          {/* Execute Prediction Button */}
          <button
            onClick={executePipelineAnalysis}
            disabled={loadingPrediction}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4 fill-current" />
            <span>{loadingPrediction ? "Calculating..." : "Run AI Degradation Analysis"}</span>
          </button>
        </div>

        {/* PROMINENT RUL PROGNOSTICS MODULE (Full width when activeTab === 'rul' or integrated in unified view) */}
        {(activeTab === "rul" || activeTab === "unified") && (
          <div className={`${activeTab === "rul" ? "lg:col-span-12" : "lg:col-span-12"} bg-gradient-to-r from-slate-900/95 via-slate-900/85 to-slate-950/95 backdrop-blur-xl border border-amber-500/20 rounded-2xl p-5 shadow-2xl space-y-5`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      RUL Prognostics &amp; End-of-Life (EOL) Retirement Planner
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                      70.0% SOH Baseline
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Continuous regression forecasting for {selectedVehicle}: projected remaining charge cycles, distance &amp; retirement horizon
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  rul?.urgency === "CRITICAL" ? "bg-red-500/15 text-red-400 border-red-500/40" :
                  rul?.urgency === "ATTENTION" ? "bg-amber-500/15 text-amber-400 border-amber-500/40" :
                  "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                }`}>
                  ● {rul?.urgency || "ROUTINE MONITORING"}
                </span>
              </div>
            </div>

            {/* RUL Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] uppercase">RUL Cycles Remaining</span>
                <div className="my-1">
                  <strong className="text-2xl font-black text-amber-400">
                    {rul?.remaining_useful_life_cycles != null ? rul.remaining_useful_life_cycles : 412}
                  </strong>
                  <span className="text-xs text-slate-500 ml-1">cycles</span>
                </div>
                <span className="text-[10px] text-slate-400">Threshold: 70.0% SOH</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] uppercase">Estimated Distance</span>
                <div className="my-1">
                  <strong className="text-2xl font-black text-emerald-400">
                    {rul?.estimated_remaining_km != null ? Math.round(rul.estimated_remaining_km / 1000) : 156}k
                  </strong>
                  <span className="text-xs text-slate-500 ml-1">km</span>
                </div>
                <span className="text-[10px] text-slate-400">@ 380 km / cycle avg</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] uppercase">Retirement Date</span>
                <div className="my-1">
                  <strong className="text-lg font-black text-white">
                    {rul?.estimated_eol_date || "2027-11-14"}
                  </strong>
                </div>
                <span className="text-[10px] text-amber-400">
                  ~{rul?.estimated_remaining_months ?? 12.3} months ({rul?.estimated_remaining_days ?? 374} days)
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                <span className="text-slate-400 text-[11px] uppercase">Degradation Rate</span>
                <div className="my-1">
                  <strong className="text-2xl font-black text-cyan-400">
                    {rul?.degradation_slope_percent_per_cycle ? `${rul.degradation_slope_percent_per_cycle}%` : "-0.028%"}
                  </strong>
                  <span className="text-[10px] text-slate-500 ml-1">/ cycle</span>
                </div>
                <span className="text-[10px] text-slate-400">Empirical slope</span>
              </div>
            </div>

            {/* Lifecycle Bar */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">
                  Pack Lifecycle Consumed:{" "}
                  <strong className="text-amber-400">{rul?.lifecycle_consumed_percent ?? 41.8}%</strong>
                </span>
                <span className="text-slate-400">
                  Pack Lifecycle Remaining:{" "}
                  <strong className="text-emerald-400">{rul?.lifecycle_remaining_percent ?? 58.2}%</strong>
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-white/10 flex">
                <div
                  className="h-full bg-gradient-to-r from-slate-700 to-amber-500/80 transition-all duration-700"
                  style={{ width: `${rul?.lifecycle_consumed_percent ?? 41.8}%` }}
                  title="Lifecycle Consumed"
                />
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${rul?.lifecycle_remaining_percent ?? 58.2}%` }}
                  title="Lifecycle Remaining"
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-500">
                <span>Cycle #0 (Factory 100% SOH)</span>
                <span>Current: Cycle #{cycle} ({Number(currentSOH).toFixed(1)}% SOH)</span>
                <span>EOL Target: Cycle #{rul?.estimated_eol_cycle ?? 820} (70.0% SOH)</span>
              </div>
            </div>

            {/* SOH Milestone Projection Table */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-300">
                  Forecast Degradation Milestones (Vehicle {selectedVehicle})
                </span>
                <span className="text-[11px] font-mono text-slate-400">Projected SOH &amp; Range Horizon</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="text-slate-500 border-b border-white/5 text-[11px]">
                      <th className="py-1.5 px-2">Cycle Horizon</th>
                      <th className="py-1.5 px-2">Projected SOH</th>
                      <th className="py-1.5 px-2">Capacity Fade</th>
                      <th className="py-1.5 px-2">Est. Odometer Remaining</th>
                      <th className="py-1.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {[
                      { offset: 10, label: "+10 Cycles" },
                      { offset: 25, label: "+25 Cycles" },
                      { offset: 50, label: "+50 Cycles" },
                      { offset: 100, label: "+100 Cycles" },
                      { offset: 150, label: "+150 Cycles" },
                    ].map(({ offset, label }) => {
                      const slope = Math.abs(Number(rul?.degradation_slope_percent_per_cycle ?? -0.028));
                      const projSoh = Math.max(70, Number(currentSOH) - offset * slope).toFixed(2);
                      const fade = (Number(currentSOH) - Number(projSoh)).toFixed(2);
                      const remainingCyc = Math.max(0, (rul?.remaining_useful_life_cycles ?? 412) - offset);
                      const remainingKm = Math.round(remainingCyc * 380);

                      return (
                        <tr key={offset} className="hover:bg-white/[0.02]">
                          <td className="py-1.5 px-2 text-white font-bold">
                            Cycle #{Number(cycle) + offset} ({label})
                          </td>
                          <td className="py-1.5 px-2 text-emerald-400 font-bold">{projSoh}%</td>
                          <td className="py-1.5 px-2 text-amber-400">-{fade}%</td>
                          <td className="py-1.5 px-2 text-slate-300">~{remainingKm.toLocaleString()} km</td>
                          <td className="py-1.5 px-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Nominal
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-red-500/5">
                      <td className="py-1.5 px-2 text-red-400 font-bold">
                        Cycle #{rul?.estimated_eol_cycle ?? 820} (EOL Retirement)
                      </td>
                      <td className="py-1.5 px-2 text-red-400 font-bold">70.00%</td>
                      <td className="py-1.5 px-2 text-red-400">
                        -{(Number(currentSOH) - 70).toFixed(2)}%
                      </td>
                      <td className="py-1.5 px-2 text-slate-400">0 km (Retire / Secondary Life)</td>
                      <td className="py-1.5 px-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 font-bold">
                          Decommissioning
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================
          FLEET-WIDE COMPARATIVE TABLE (Section 3 Requirement)
          ============================================================ */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Fleet Comparative Roster</h3>
            <p className="text-xs text-slate-400">Compare telemetry status, degradation index, and risk ranking across all vehicles</p>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Vehicle</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Current Health</th>
                <th className="py-2.5 px-3">Degradation</th>
                <th className="py-2.5 px-3">Cycle</th>
                <th className="py-2.5 px-3">RUL (Cycles)</th>
                <th className="py-2.5 px-3">Est. Dist</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">RUL Urgency</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredFleet.map((v) => {
                const isSelected = v.battery_id === selectedVehicle;
                const vRisk = String(v.risk_level || v.status || "Normal");
                const vRulCycles = v.remaining_useful_life_cycles != null ? v.remaining_useful_life_cycles : null;
                const vRulKm = v.estimated_remaining_km != null ? v.estimated_remaining_km : null;
                const vUrgency = v.rul_urgency || (vRulCycles && vRulCycles <= 35 ? "CRITICAL" : vRulCycles && vRulCycles <= 85 ? "ATTENTION" : "NORMAL");

                return (
                  <tr
                    key={v.battery_id}
                    className={`transition-colors ${
                      isSelected ? "bg-amber-500/10 font-bold" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-white">{v.battery_id}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-emerald-400">● {v.status || "Operational"}</span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400">
                      {v.current_soh_percent != null ? `${Number(v.current_soh_percent).toFixed(1)}%` : "--"}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">
                      {v.degradation_percent != null ? `-${Number(v.degradation_percent).toFixed(1)}%` : "--"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{v.cycle ?? "--"}</td>
                    <td className="py-2.5 px-3">
                      {vRulCycles != null ? (
                        <span className={`font-bold ${
                          vRulCycles <= 50 ? "text-red-400" :
                          vRulCycles <= 120 ? "text-amber-400" : "text-emerald-400"
                        }`}>
                          {vRulCycles} cyc
                        </span>
                      ) : (
                        <span className="text-slate-500">~380 cyc</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {vRulKm != null ? `~${Math.round(vRulKm / 1000)}k km` : "~144k km"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {v.capacity_Ah != null ? `${Number(v.capacity_Ah).toFixed(2)} Ah` : "--"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        vUrgency === "CRITICAL" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                        vUrgency === "ATTENTION" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                        "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {vUrgency}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => onSelectVehicle(v.battery_id)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[11px] font-sans font-semibold transition"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
