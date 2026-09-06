import { useEffect, useState } from "react";
import "./App.css";
import MapPage from "./MapPage";

const API_URL = "http://127.0.0.1:8000";

const DISPLAY_FIELDS = [
  ["cycle", "Cycle", "1"],
  ["voltage_mean", "Voltage Mean", "0.01"],
  ["voltage_min", "Voltage Min", "0.01"],
  ["voltage_max", "Voltage Max", "0.01"],
  ["current_mean", "Current Mean", "0.01"],
  ["current_min", "Current Min", "0.01"],
  ["temperature_mean", "Temperature Mean", "0.1"],
  ["discharge_duration", "Discharge Duration", "1"],
  ["capacity_Ah", "Capacity (Ah)", "0.01"],
  ["initial_capacity_Ah", "Initial Capacity (Ah)", "0.01"],
  ["capacity_change", "Capacity Change", "0.01"],
  ["cycle_progress", "Cycle Progress", "0.01"],
];

// ============================================================
// NAV ICONS — small inline SVGs, sized via .nav-item svg in App.css
// ============================================================

const NAV_ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  prediction: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M22 10v4" strokeLinecap="round" />
      <path d="M6 12h3l1.5-3L12 15l1.5-3H16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  fleet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 16V8a1 1 0 011-1h9l4 4v5a1 1 0 01-1 1H4a1 1 0 01-1-1z" />
      <circle cx="7.5" cy="17.5" r="1.7" />
      <circle cx="16.5" cy="17.5" r="1.7" />
    </svg>
  ),
  addVehicle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" strokeLinecap="round" />
    </svg>
  ),
  maintenance: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.1-2.1 2.7-2.5z" strokeLinejoin="round" />
    </svg>
  ),
  realtime: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12h4l2 7 4-14 2 7h8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
};

function getVehicleFromPath() {
  const match = window.location.pathname.match(
    /^\/vehicles\/([^/]+)(?:\/|$)/i
  );

  return match ? decodeURIComponent(match[1]).trim() : "";
}

function getPageFromPath() {
  const path = window.location.pathname.toLowerCase();

  if (path.includes("/maintenance")) {
    return "maintenance";
  }

  if (path.includes("/analytics")) {
    return "analytics";
  }

  if (path.includes("/charging-map") || path.includes("/map")) {
    return "map";
  }

  if (path.includes("/realtime") || path.includes("/telemetry")) {
    return "realtime";
  }

  if (path.includes("/fleet")) {
    return "fleet";
  }

  if (path.includes("/add-vehicle")) {
    return "addVehicle";
  }

  if (path.includes("/prediction")) {
    return "prediction";
  }

  return "dashboard";
}

function navigateToPage(page) {
  setTimeout(() => {
    window.history.replaceState({}, "", page === "map" ? "/charging-map" : "/");
  }, 0);
}

// ============================================================
// BATTERY PACK HEALTH — estimated per-module visualization
// Built from aggregate SOH (no per-cell telemetry exists yet),
// so cell counts are a proportional estimate, not measured data.
// ============================================================

function buildPackCells(soh, totalCells = 24) {
  const safeSoh = Number.isFinite(soh) ? Math.max(0, Math.min(100, soh)) : 100;

  const healthyCount = Math.round((safeSoh / 100) * totalCells);
  const remaining = totalCells - healthyCount;
  const criticalCount = Math.round(remaining * 0.35);
  const warnCount = remaining - criticalCount;

  const cells = [
    ...Array(healthyCount).fill("healthy"),
    ...Array(warnCount).fill("warn"),
    ...Array(criticalCount).fill("critical"),
  ];

  // Spread the flagged cells out instead of clustering them at the end.
  const spread = new Array(totalCells).fill("healthy");
  let cursor = 0;
  cells
    .filter((c) => c !== "healthy")
    .forEach((status, i) => {
      const position = (i * 7 + 3) % totalCells;
      spread[position] = status;
    });
  for (let i = 0; i < totalCells; i++) {
    if (spread[i] !== "healthy") continue;
    if (cursor < healthyCount) cursor++;
  }

  return spread;
}

function App() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(
    getVehicleFromPath()
  );

  const [activePage, setActivePage] = useState(
    getPageFromPath()
  );

  const [fleet, setFleet] = useState(null);
  const [loadingFleet, setLoadingFleet] = useState(false);

  const [maintenance, setMaintenance] = useState(null);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);

  const [battery, setBattery] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [predictionDetails, setPredictionDetails] = useState(null);
  const [animatedPrediction, setAnimatedPrediction] = useState(0);

  const [trend, setTrend] = useState(null);
  const [trendData, setTrendData] = useState([]);

  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [loadingBattery, setLoadingBattery] = useState(false);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingPrediction, setLoadingPrediction] = useState(false);

  const [error, setError] = useState("");


  // ============================================================
  // REAL-TIME TELEMETRY
  // ============================================================

  const [telemetry, setTelemetry] = useState(null);
  const [telemetryError, setTelemetryError] = useState("");
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(true);

  // ============================================================
  // ADD VEHICLE / MAT UPLOAD
  // ============================================================

  const [newVehicleId, setNewVehicleId] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadingVehicle, setUploadingVehicle] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  // ============================================================
  // LOAD VEHICLES
  // ============================================================

  useEffect(() => {
    const loadVehicles = async () => {
      try {
        setLoadingVehicles(true);
        setError("");

        const response = await fetch(`${API_URL}/vehicles`);

        if (!response.ok) {
          throw new Error("Unable to load vehicles.");
        }

        const data = await response.json();
        const vehicleList = data.vehicles || [];

        setVehicles(vehicleList);

        const vehicleFromPath = getVehicleFromPath();

        if (
          vehicleFromPath &&
          vehicleList.some(
            (vehicleId) =>
              String(vehicleId).toUpperCase() ===
              vehicleFromPath.toUpperCase()
          )
        ) {
          const matchedVehicle = vehicleList.find(
            (vehicleId) =>
              String(vehicleId).toUpperCase() ===
              vehicleFromPath.toUpperCase()
          );

          setSelectedVehicle(matchedVehicle);
        } else if (vehicleList.length > 0) {
          setSelectedVehicle(vehicleList[0]);
        }
      } catch (err) {
        console.error("Vehicle loading error:", err);
        setError("Unable to connect to the vehicle database.");
      } finally {
        setLoadingVehicles(false);
      }
    };

    loadVehicles();
  }, []);

  // ============================================================
  // LOAD SELECTED VEHICLE
  // ============================================================

  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }

    const loadVehicle = async () => {
      try {
        setLoadingBattery(true);
        setError("");
        setPrediction(null);
        setPredictionDetails(null);
        setAnimatedPrediction(0);

        const response = await fetch(
          `${API_URL}/vehicles/${selectedVehicle}`
        );

        if (!response.ok) {
          throw new Error("Unable to load vehicle data.");
        }

        const data = await response.json();

        const vehicleData = {
          ...data,
          ...(data.parameters || {}),
        };

        setBattery(vehicleData);
      } catch (err) {
        console.error("Battery loading error:", err);
        setBattery({});
        setError("Unable to load battery data for this vehicle.");
      } finally {
        setLoadingBattery(false);
      }
    };

    loadVehicle();
  }, [selectedVehicle]);

  // ============================================================
  // LOAD FLEET
  // ============================================================

  useEffect(() => {
    const loadFleet = async () => {
      try {
        setLoadingFleet(true);

        const response = await fetch(`${API_URL}/fleet`);

        if (!response.ok) {
          throw new Error("Unable to load fleet data.");
        }

        const data = await response.json();

        setFleet(data);
      } catch (err) {
        console.error("Fleet loading error:", err);
        setFleet(null);
      } finally {
        setLoadingFleet(false);
      }
    };

    loadFleet();
  }, []);

  // ============================================================
  // LOAD MAINTENANCE
  // ============================================================

  const loadMaintenance = async () => {
    try {
      setLoadingMaintenance(true);

      const response = await fetch(
        `${API_URL}/maintenance`
      );

      if (!response.ok) {
        throw new Error("Unable to load maintenance data.");
      }

      const data = await response.json();

      console.log("Maintenance response:", data);

      setMaintenance(data);
    } catch (err) {
      console.error(
        "Maintenance loading error:",
        err
      );

      setMaintenance(null);
    } finally {
      setLoadingMaintenance(false);
    }
  };

  useEffect(() => {
    loadMaintenance();
  }, []);

  // ============================================================
  // LOAD TREND
  // ============================================================

  useEffect(() => {
    if (!selectedVehicle) {
      return;
    }

    const loadTrend = async () => {
      try {
        setLoadingTrend(true);

        const response = await fetch(
          `${API_URL}/vehicles/${selectedVehicle}/trend`
        );

        if (!response.ok) {
          throw new Error("Unable to load battery trend.");
        }

        const data = await response.json();

        setTrend(data);

        setTrendData(
          Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.history)
              ? data.history
              : []
        );
      } catch (err) {
        console.error("Trend loading error:", err);

        setTrend(null);
        setTrendData([]);
      } finally {
        setLoadingTrend(false);
      }
    };

    loadTrend();
  }, [selectedVehicle]);


  // ============================================================
  // LIVE TELEMETRY POLLING
  // ============================================================

  useEffect(() => {
    if (!selectedVehicle || !telemetryEnabled || activePage !== "realtime") {
      setTelemetry(null);
      return undefined;
    }

    let cancelled = false;

    const loadTelemetry = async () => {
      try {
        setLoadingTelemetry(true);
        const response = await fetch(
          `${API_URL}/telemetry/${selectedVehicle}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.detail || "Unable to load live telemetry."
          );
        }

        if (!cancelled) {
          setTelemetry(data);
          setTelemetryError("");
        }
      } catch (err) {
        console.error("Telemetry error:", err);
        if (!cancelled) {
          setTelemetryError(err.message || "Telemetry unavailable.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTelemetry(false);
        }
      }
    };

    loadTelemetry();
    const interval = setInterval(loadTelemetry, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedVehicle, telemetryEnabled]);

  // ============================================================
  // ANIMATE PREDICTION
  // ============================================================

  useEffect(() => {
    if (prediction === null) {
      setAnimatedPrediction(0);
      return;
    }

    let current = 0;

    const steps = 60;
    const increment = prediction / steps;

    const interval = setInterval(() => {
      current += increment;

      if (current >= prediction) {
        current = prediction;
        clearInterval(interval);
      }

      setAnimatedPrediction(
        Number(current.toFixed(2))
      );
    }, 20);

    return () => clearInterval(interval);
  }, [prediction]);

  // ============================================================
  // PREDICT
  // ============================================================

  const handlePredict = async () => {
    if (!selectedVehicle) {
      return;
    }

    try {
      setLoadingPrediction(true);
      setError("");
      setPrediction(null);
      setPredictionDetails(null);
      setAnimatedPrediction(0);

      const response = await fetch(
        `${API_URL}/vehicles/${selectedVehicle}/prediction`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
          data?.detail ||
          "Prediction request failed."
        );
      }

      console.log(
        "Prediction response:",
        data
      );

      const predictedSOH = Number(
        data.predicted_soh_percent
      );

      setPrediction(predictedSOH);
      setPredictionDetails(data);

    } catch (err) {
      console.error(
        "Prediction error:",
        err
      );

      setPrediction(null);
      setPredictionDetails(null);
      setAnimatedPrediction(0);

      setError(
        err.message ||
        "Unable to connect to the prediction API."
      );
    } finally {
      setLoadingPrediction(false);
    }
  };

  // ============================================================
  // ADD VEHICLE
  // ============================================================

  const handleAddVehicle = async (event) => {
    event.preventDefault();

    setUploadMessage("");
    setUploadError("");
    setError("");

    const vehicleId = newVehicleId.trim().toUpperCase();

    if (!vehicleId) {
      setUploadError("Please enter a vehicle ID.");
      return;
    }

    if (!uploadFile) {
      setUploadError("Please select a .mat battery file.");
      return;
    }

    if (!uploadFile.name.toLowerCase().endsWith(".mat")) {
      setUploadError("Only .mat battery files are supported.");
      return;
    }

    try {
      setUploadingVehicle(true);

      const formData = new FormData();
      formData.append("vehicle_id", vehicleId);
      formData.append("file", uploadFile);

      const response = await fetch(
        `${API_URL}/vehicles/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.detail?.message ||
          data?.detail ||
          data?.message ||
          "Vehicle upload failed."
        );
      }

      setUploadMessage(
        data?.message ||
        `Vehicle ${vehicleId} was added successfully.`
      );

      setNewVehicleId("");
      setUploadFile(null);

      const fileInput = document.getElementById("battery-mat-file");
      if (fileInput) {
        fileInput.value = "";
      }

      // Refresh vehicle list.
      const vehiclesResponse = await fetch(
        `${API_URL}/vehicles`
      );

      if (vehiclesResponse.ok) {
        const vehiclesData = await vehiclesResponse.json();
        const updatedVehicles = vehiclesData.vehicles || [];

        setVehicles(updatedVehicles);

        if (updatedVehicles.includes(vehicleId)) {
          setSelectedVehicle(vehicleId);
        }
      }

      // Refresh fleet data.
      const fleetResponse = await fetch(
        `${API_URL}/fleet`
      );

      if (fleetResponse.ok) {
        const fleetData = await fleetResponse.json();
        setFleet(fleetData);
      }

      // Refresh maintenance data.
      await loadMaintenance();

      // Go to the new vehicle dashboard after successful upload.
      setActivePage("dashboard");

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

    } catch (err) {
      console.error("Add vehicle error:", err);

      setUploadError(
        err.message ||
        "Unable to add the vehicle."
      );
    } finally {
      setUploadingVehicle(false);
    }
  };

  // ============================================================
  // HEALTH STATUS
  // ============================================================

  const getHealthStatus = () => {
    if (prediction === null) {
      return null;
    }

    if (prediction >= 80) {
      return {
        text: "Healthy",
        className: "healthy",
        message:
          "The battery is in good health and operating normally.",
      };
    }

    if (prediction >= 60) {
      return {
        text: "Good",
        className: "good",
        message:
          "The battery is performing well, but some degradation is beginning.",
      };
    }

    if (prediction >= 40) {
      return {
        text: "Needs Attention",
        className: "attention",
        message:
          "The battery shows significant degradation and should be monitored.",
      };
    }

    return {
      text: "Critical",
      className: "critical",
      message:
        "The battery health is critically low and maintenance is recommended.",
    };
  };

  const healthStatus = getHealthStatus();

  // ============================================================
  // DISPLAY VALUE
  // ============================================================

  const getValue = (field) => {
    const value = battery[field];

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return "";
    }

    if (typeof value === "number") {
      return Number(value.toFixed(4));
    }

    return value;
  };

  // ============================================================
  // FLEET STATUS
  // ============================================================

  const getFleetStatusClass = (status) => {
    const value = String(
      status || ""
    ).toLowerCase();

    if (value === "excellent") {
      return "fleet-excellent";
    }

    if (value === "good") {
      return "fleet-good";
    }

    if (value === "fair") {
      return "fleet-fair";
    }

    return "fleet-critical";
  };

  // ============================================================
  // MAINTENANCE RISK CLASS
  // ============================================================

  const getRiskClass = (risk) => {
    const value = String(
      risk || ""
    ).toLowerCase();

    if (value === "critical") {
      return "maintenance-critical";
    }

    if (value === "high") {
      return "maintenance-high";
    }

    if (value === "medium") {
      return "maintenance-medium";
    }

    return "maintenance-low";
  };

  // ============================================================
  // OPEN VEHICLE
  // ============================================================

  const openVehicleFromFleet = (vehicleId) => {
    setSelectedVehicle(vehicleId);
    setActivePage("dashboard");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ============================================================
  // OPEN VEHICLE FROM MAINTENANCE
  // ============================================================

  const openVehicleFromMaintenance = (
    vehicleId
  ) => {
    setSelectedVehicle(vehicleId);
    setActivePage("dashboard");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };


  // ============================================================
  // LIVE TELEMETRY PAGE
  // ============================================================

  const renderRealtimePage = () => {
    const t = telemetry || {};
    const risk = String(t.risk_level || "LOW").toLowerCase();
    const riskClass =
      risk === "critical"
        ? "maintenance-critical"
        : risk === "high"
          ? "maintenance-high"
          : risk === "medium"
            ? "maintenance-medium"
            : "maintenance-low";

    const metricCards = [
      ["Voltage", `${Number(t.voltage_v || 0).toFixed(2)} V`, "Live pack voltage"],
      ["Current", `${Number(t.current_a || 0).toFixed(1)} A`, "Live battery current"],
      ["Temperature", `${Number(t.temperature_c || 0).toFixed(1)} °C`, "Live thermal signal"],
      ["SOC", `${Number(t.soc_percent || 0).toFixed(0)}%`, "Simulated state of charge"],
      ["Power", `${Number(t.power_kw || 0).toFixed(2)} kW`, "Instantaneous power"],
      ["Cycle", t.cycle ?? "--", "Latest battery cycle"],
    ];

    return (
      <div className="fleet-page">
        <div className="page-heading">
          <div>
            <h1>Live Telemetry</h1>
            <p>
              Continuous battery telemetry with real-time AI inference for {selectedVehicle || "the selected vehicle"}.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="status-dot" style={{ background: telemetryEnabled ? "#2fe0ad" : "#5b6673" }}></span>
            <strong>{telemetryEnabled ? "Streaming" : "Paused"}</strong>
          </div>
        </div>

        <section className="fleet-card" style={{ marginBottom: 24 }}>
          <div className="fleet-card-header">
            <div>
              <h2>Telemetry Stream</h2>
              <p>
                Demo mode uses simulated telemetry generated from the selected vehicle's latest real battery record.
              </p>
            </div>
            <button
              className="predict-button"
              style={{ margin: 0, width: "auto", padding: "10px 18px" }}
              onClick={() => setTelemetryEnabled((value) => !value)}
            >
              {telemetryEnabled ? "Pause Stream" : "Resume Stream"}
            </button>
          </div>

          {telemetryError ? (
            <div className="error-message">⚠️ {telemetryError}</div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 14, marginTop: 18 }}>
                {metricCards.map(([label, value, caption]) => (
                  <div key={label} className="stat-card" style={{ boxShadow: "none" }}>
                    <span>{label}</span>
                    <strong>{loadingTelemetry && !telemetry ? "--" : value}</strong>
                    <small>{caption}</small>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 18, marginTop: 18 }}>
                <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 18, background: "#0a0f15" }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>AI health inference</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                    <strong style={{ fontSize: 34 }}>{t.predicted_soh_percent != null ? `${Number(t.predicted_soh_percent).toFixed(2)}%` : "--"}</strong>
                    <span style={{ color: "var(--muted)" }}>predicted SOH</span>
                  </div>
                  <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>
                    Recorded SOH: {t.current_soh_percent != null ? `${Number(t.current_soh_percent).toFixed(2)}%` : "--"}
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 18, background: "#0a0f15" }}>
                  <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>Operational status</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`risk-badge ${riskClass}`}>{t.risk_level || "LOW"}</span>
                    <strong>{t.status || "Waiting for telemetry"}</strong>
                  </div>
                  <p style={{ margin: "12px 0 0", color: "var(--muted)", fontSize: 13 }}>
                    {t.recommendation || "Waiting for the first telemetry packet."}
                  </p>
                </div>
              </div>

              {t.anomaly && (
                <div className="error-message" style={{ marginTop: 18 }}>
                  ⚠️ Live anomaly detected — elevated thermal/current conditions require attention.
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 12 }}>
                <span>Source: {t.source === "simulated_telemetry" ? "Simulated telemetry" : (t.source || "Telemetry")}</span>
                <span>Last update: {t.timestamp ? new Date(t.timestamp).toLocaleTimeString() : "--"}</span>
              </div>
            </>
          )}
        </section>
      </div>
    );
  };

  // ============================================================
  // FLEET PAGE
  // ============================================================

  const renderFleetPage = () => {
    const summary =
      fleet?.summary || {};

    const fleetVehicles =
      Array.isArray(fleet?.fleet)
        ? fleet.fleet
        : [];

    return (
      <div className="fleet-page">

        <div className="page-heading">

          <div>
            <h1>
              Fleet Monitoring
            </h1>

            <p>
              Monitor battery health and
              predictive maintenance across
              the entire EV fleet.
            </p>
          </div>

          <button
            className="refresh-fleet-button"
            onClick={() =>
              window.location.reload()
            }
          >
            ↻ Refresh Fleet
          </button>

        </div>

        {loadingFleet ? (

          <div className="fleet-loading">
            Loading fleet data...
          </div>

        ) : !fleet ? (

          <div className="fleet-error">
            Unable to load fleet data.
            Make sure the FastAPI server
            is running.
          </div>

        ) : (

          <>

            <section className="fleet-summary-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px" }}>

              <div className="fleet-summary-card">
                <span>
                  Total Vehicles
                </span>

                <strong>
                  {summary.total_vehicles ??
                    fleetVehicles.length}
                </strong>

                <small>
                  Vehicles in fleet
                </small>
              </div>

              <div className="fleet-summary-card">

                <span>
                  Average SOH
                </span>

                <strong>
                  {summary.average_soh_percent != null
                    ? `${Number(
                        summary.average_soh_percent
                      ).toFixed(2)}%`
                    : "--"}
                </strong>

                <small>
                  Current fleet health
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Healthy
                </span>

                <strong>
                  {summary.excellent ?? 0}
                </strong>

                <small>
                  Excellent condition
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Good
                </span>

                <strong>
                  {summary.good ?? 0}
                </strong>

                <small>
                  Good condition
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Fair
                </span>

                <strong>
                  {summary.fair ?? 0}
                </strong>

                <small>
                  Needs monitoring
                </small>

              </div>

              <div className="fleet-summary-card critical-summary">

                <span>
                  Critical
                </span>

                <strong>
                  {summary.critical ?? 0}
                </strong>

                <small>
                  Maintenance recommended
                </small>

              </div>

            </section>

            <section className="fleet-card">

              <div className="fleet-card-header">

                <div>

                  <h2>
                    Fleet Battery Health
                  </h2>

                  <p>
                    Latest battery condition
                    and model predictions for
                    each vehicle.
                  </p>

                </div>

                <div className="fleet-count">
                  {fleetVehicles.length} vehicles
                </div>

              </div>

              <div className="fleet-table-wrapper">

                <table className="fleet-table">

                  <thead>

                    <tr>
                      <th>Vehicle</th>
                      <th>Current SOH</th>
                      <th>Predicted SOH</th>
                      <th>Degradation</th>
                      <th>Cycle</th>
                      <th>Capacity</th>
                      <th>Error</th>
                      <th>Status</th>
                      <th></th>
                    </tr>

                  </thead>

                  <tbody>

                    {fleetVehicles.map(
                      (vehicle) => (

                        <tr
                          key={
                            vehicle.battery_id
                          }
                        >

                          <td>

                            <button
                              className="vehicle-link"
                              onClick={() =>
                                openVehicleFromFleet(
                                  vehicle.battery_id
                                )
                              }
                            >

                              <span className="vehicle-badge">
                                EV
                              </span>

                              <strong>
                                {vehicle.battery_id}
                              </strong>

                            </button>

                          </td>

                          <td>
                            <strong>
                              {vehicle.current_soh_percent != null
                                ? `${Number(
                                    vehicle.current_soh_percent
                                  ).toFixed(2)}%`
                                : "--"}
                            </strong>
                          </td>

                          <td>
                            {vehicle.predicted_soh_percent != null
                              ? `${Number(
                                  vehicle.predicted_soh_percent
                                ).toFixed(2)}%`
                              : "--"}
                          </td>

                          <td>
                            {vehicle.degradation_percent != null
                              ? `${Number(
                                  vehicle.degradation_percent
                                ).toFixed(2)}%`
                              : "--"}
                          </td>

                          <td>
                            {vehicle.cycle ?? "--"}
                          </td>

                          <td>
                            {vehicle.capacity_Ah != null
                              ? `${Number(
                                  vehicle.capacity_Ah
                                ).toFixed(4)} Ah`
                              : "--"}
                          </td>

                          <td>
                            {vehicle.prediction_error_percent != null
                              ? `${Number(
                                  vehicle.prediction_error_percent
                                ).toFixed(2)}%`
                              : "--"}
                          </td>

                          <td>

                            <span
                              className={`fleet-status ${getFleetStatusClass(
                                vehicle.status
                              )}`}
                            >

                              <span className="fleet-status-dot"></span>

                              {vehicle.status ||
                                "Unknown"}

                            </span>

                          </td>

                          <td>

                            <button
                              className="view-vehicle-button"
                              onClick={() =>
                                openVehicleFromFleet(
                                  vehicle.battery_id
                                )
                              }
                            >
                              View
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

          </>

        )}

      </div>
    );
  };

  // ============================================================
  // MAINTENANCE PAGE
  // ============================================================

  const renderMaintenancePage = () => {

    const summary =
      maintenance?.summary || {};

    const maintenanceVehicles =
      Array.isArray(
        maintenance?.maintenance
      )
        ? maintenance.maintenance
        : [];

    return (
      <div className="fleet-page">

        {/* HEADER */}

        <div className="page-heading">

          <div>

            <h1>
              Maintenance Intelligence
            </h1>

            <p>
              AI-assisted battery risk
              assessment and preventive
              maintenance prioritization.
            </p>

          </div>

          <button
            className="refresh-fleet-button"
            onClick={loadMaintenance}
            disabled={loadingMaintenance}
          >
            {loadingMaintenance
              ? "⏳ Analyzing..."
              : "↻ Refresh Maintenance"}
          </button>

        </div>

        {/* LOADING */}

        {loadingMaintenance ? (

          <div className="fleet-loading">
            Analyzing battery maintenance
            risks...
          </div>

        ) : !maintenance ? (

          <div className="fleet-error">
            Unable to load maintenance
            intelligence. Make sure the
            FastAPI server is running.
          </div>

        ) : (

          <>

            {/* SUMMARY */}

            <section className="fleet-summary-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "14px" }}>

              <div className="fleet-summary-card">

                <span>
                  Total Vehicles
                </span>

                <strong>
                  {summary.total_vehicles ?? 0}
                </strong>

                <small>
                  Batteries analyzed
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Low Risk
                </span>

                <strong>
                  {summary.low ?? 0}
                </strong>

                <small>
                  Normal monitoring
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Medium Risk
                </span>

                <strong>
                  {summary.medium ?? 0}
                </strong>

                <small>
                  Inspection advised
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  High Risk
                </span>

                <strong>
                  {summary.high ?? 0}
                </strong>

                <small>
                  Preventive maintenance
                </small>

              </div>

              <div className="fleet-summary-card critical-summary">

                <span>
                  Critical
                </span>

                <strong>
                  {summary.critical ?? 0}
                </strong>

                <small>
                  Immediate attention
                </small>

              </div>

              <div className="fleet-summary-card">

                <span>
                  Maintenance Required
                </span>

                <strong>
                  {summary.maintenance_required ?? 0}
                </strong>

                <small>
                  Vehicles requiring action
                </small>

              </div>

            </section>

            {/* MAINTENANCE TABLE */}

            <section className="fleet-card">

              <div className="fleet-card-header">

                <div>

                  <h2>
                    Maintenance Priority
                  </h2>

                  <p>
                    Vehicles are ranked by
                    maintenance priority.
                  </p>

                </div>

                <div className="fleet-count">
                  {maintenanceVehicles.length} vehicles
                </div>

              </div>

              <div className="fleet-table-wrapper">

                <table className="fleet-table">

                  <thead>

                    <tr>

                      <th>
                        Vehicle
                      </th>

                      <th>
                        Risk
                      </th>

                      <th>
                        Risk Score
                      </th>

                      <th>
                        Priority
                      </th>

                      <th>
                        Current SOH
                      </th>

                      <th>
                        Predicted SOH
                      </th>

                      <th>
                        Degradation
                      </th>

                      <th>
                        Cycle
                      </th>

                      <th>
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {maintenanceVehicles.map(
                      (vehicle) => (

                        <tr
                          key={
                            vehicle.battery_id
                          }
                        >

                          <td>

                            <button
                              className="vehicle-link"
                              onClick={() =>
                                openVehicleFromMaintenance(
                                  vehicle.battery_id
                                )
                              }
                            >

                              <span className="vehicle-badge">
                                EV
                              </span>

                              <strong>
                                {vehicle.battery_id}
                              </strong>

                            </button>

                          </td>

                          <td>

                            <span
                              className={`fleet-status ${getRiskClass(
                                vehicle.risk_level
                              )}`}
                            >

                              <span className="fleet-status-dot"></span>

                              {vehicle.risk_level ||
                                "UNKNOWN"}

                            </span>

                          </td>

                          <td>

                            <strong>
                              {vehicle.risk_score ?? "--"}
                            </strong>

                          </td>

                          <td>

                            <strong>
                              {vehicle.priority_score ?? "--"}
                            </strong>

                          </td>

                          <td>

                            {vehicle.current_soh_percent != null
                              ? `${Number(
                                  vehicle.current_soh_percent
                                ).toFixed(2)}%`
                              : "--"}

                          </td>

                          <td>

                            {vehicle.predicted_soh_percent != null
                              ? `${Number(
                                  vehicle.predicted_soh_percent
                                ).toFixed(2)}%`
                              : "--"}

                          </td>

                          <td>

                            {vehicle.degradation_percent != null
                              ? `${Number(
                                  vehicle.degradation_percent
                                ).toFixed(2)}%`
                              : "--"}

                          </td>

                          <td>
                            {vehicle.cycle ?? "--"}
                          </td>

                          <td>

                            <button
                              className="view-vehicle-button"
                              onClick={() =>
                                openVehicleFromMaintenance(
                                  vehicle.battery_id
                                )
                              }
                            >
                              View
                            </button>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>

            </section>

            {/* DETAILED MAINTENANCE CARDS */}

            <section className="maintenance-details-grid">

              {maintenanceVehicles.map(
                (vehicle) => (

                  <div
                    className={`maintenance-detail-card ${getRiskClass(
                      vehicle.risk_level
                    )}`}
                    key={`detail-${vehicle.battery_id}`}
                  >

                    <div className="maintenance-detail-header">

                      <div>

                        <span className="vehicle-badge">
                          EV
                        </span>

                        <h3>
                          {vehicle.battery_id}
                        </h3>

                      </div>

                      <span
                        className={`maintenance-risk-badge ${getRiskClass(
                          vehicle.risk_level
                        )}`}
                      >
                        {vehicle.risk_level}
                      </span>

                    </div>

                    <div className="maintenance-score">

                      <span>
                        Priority Score
                      </span>

                      <strong>
                        {vehicle.priority_score ?? 0}
                      </strong>

                      <small>
                        / 100
                      </small>

                    </div>

                    <div className="maintenance-metrics">

                      <div>
                        <span>
                          Current SOH
                        </span>

                        <strong>
                          {vehicle.current_soh_percent != null
                            ? `${Number(
                                vehicle.current_soh_percent
                              ).toFixed(2)}%`
                            : "--"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Predicted SOH
                        </span>

                        <strong>
                          {vehicle.predicted_soh_percent != null
                            ? `${Number(
                                vehicle.predicted_soh_percent
                              ).toFixed(2)}%`
                            : "--"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Degradation
                        </span>

                        <strong>
                          {vehicle.degradation_percent != null
                            ? `${Number(
                                vehicle.degradation_percent
                              ).toFixed(2)}%`
                            : "--"}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Cycle
                        </span>

                        <strong>
                          {vehicle.cycle ?? "--"}
                        </strong>
                      </div>

                    </div>

                    <div className="maintenance-recommendation">

                      <span>
                        Recommendation
                      </span>

                      <p>
                        {vehicle.recommendation ||
                          "No recommendation available."}
                      </p>

                    </div>

                    <div className="maintenance-reason">

                      <span>
                        Why?
                      </span>

                      <p>
                        {vehicle.reason ||
                          "No specific risk factors detected."}
                      </p>

                    </div>

                    {Array.isArray(
                      vehicle.risk_factors
                    ) &&
                      vehicle.risk_factors.length >
                        0 && (

                        <div className="risk-factors">

                          <span>
                            Risk Factors
                          </span>

                          <ul>

                            {vehicle.risk_factors.map(
                              (
                                factor,
                                index
                              ) => (

                                <li
                                  key={`${vehicle.battery_id}-${index}`}
                                >
                                  {factor}
                                </li>

                              )
                            )}

                          </ul>

                        </div>

                      )}

                    <button
                      className="maintenance-view-button"
                      onClick={() =>
                        openVehicleFromMaintenance(
                          vehicle.battery_id
                        )
                      }
                    >
                      View Battery Details
                    </button>

                  </div>

                )
              )}

            </section>

          </>

        )}

      </div>
    );
  };

  // ============================================================
  // ADD VEHICLE PAGE
  // ============================================================

  const renderAddVehiclePage = () => {
    return (
      <div className="fleet-page">

        <div className="page-heading">
          <div>
            <h1>Add Vehicle</h1>
            <p>
              Register a new EV battery by uploading its raw
              NASA-style MAT battery data.
            </p>
          </div>
        </div>

        <section className="fleet-card">
          <div className="fleet-card-header">
            <div>
              <h2>New Battery Registration</h2>
              <p>
                Enter a unique vehicle ID and upload the raw
                <strong> .mat </strong>
                battery file. The backend will automatically
                extract battery features, store the records,
                calculate SOH, and make the vehicle available
                for prediction and maintenance analysis.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAddVehicle}
            style={{
              maxWidth: "720px",
              margin: "30px auto",
            }}
          >

            <div
              style={{
                display: "grid",
                gap: "22px",
              }}
            >

              <div className="input-group">
                <label htmlFor="new-vehicle-id">
                  Vehicle ID
                </label>

                <input
                  id="new-vehicle-id"
                  type="text"
                  placeholder="Example: EV0028"
                  value={newVehicleId}
                  onChange={(e) =>
                    setNewVehicleId(
                      e.target.value.toUpperCase()
                    )
                  }
                  disabled={uploadingVehicle}
                  required
                />

                <small>
                  Use a unique ID for the new EV.
                </small>
              </div>

              <div className="input-group">
                <label htmlFor="battery-mat-file">
                  Raw Battery File
                </label>

                <input
                  id="battery-mat-file"
                  type="file"
                  accept=".mat"
                  onChange={(e) =>
                    setUploadFile(
                      e.target.files?.[0] || null
                    )
                  }
                  disabled={uploadingVehicle}
                  required
                />

                <small>
                  Supported format: MATLAB .mat battery dataset.
                </small>
              </div>

              {uploadFile && (
                <div className="selected-file">
                  Selected file:{" "}
                  <strong>{uploadFile.name}</strong>
                </div>
              )}

              {uploadError && (
                <div className="error-message">
                  ⚠️ {uploadError}
                </div>
              )}

              {uploadMessage && (
                <div className="upload-success">
                  ✅ {uploadMessage}
                </div>
              )}

              <button
                type="submit"
                className="predict-button"
                disabled={uploadingVehicle}
              >
                {uploadingVehicle
                  ? "⏳ Processing Battery..."
                  : "⚡ Add Vehicle"}
              </button>

            </div>

          </form>

          <div
            className="card"
            style={{
              maxWidth: "720px",
              margin: "0 auto 30px",
            }}
          >
            <h3 style={{ marginTop: 0, color: "var(--text)" }}>
              What happens automatically?
            </h3>

            <ul style={{ lineHeight: 1.8, color: "var(--text-2)" }}>
              <li>Raw MAT data is processed by the backend.</li>
              <li>Battery cycle features are extracted.</li>
              <li>Records are stored in the vehicle database.</li>
              <li>SOH prediction becomes available.</li>
              <li>Degradation is calculated automatically.</li>
              <li>Maintenance risk is analyzed automatically.</li>
              <li>The vehicle appears in Fleet Monitoring.</li>
            </ul>
          </div>

        </section>

      </div>
    );
  };

  // ============================================================
  // TREND GRAPH
  // ============================================================

  const renderTrendGraph = () => {

    if (loadingTrend) {
      return (
        <div className="loading-message">
          Loading SOH trend...
        </div>
      );
    }

    if (!trendData.length) {
      return (
        <div className="loading-message">
          No trend data available.
        </div>
      );
    }

    const width = 900;
    const height = 300;

    const paddingLeft = 55;
    const paddingRight = 25;
    const paddingTop = 25;
    const paddingBottom = 45;

    const graphWidth =
      width -
      paddingLeft -
      paddingRight;

    const graphHeight =
      height -
      paddingTop -
      paddingBottom;

    const sohValues = trendData
      .map((item) =>
        Number(item.soh_percent)
      )
      .filter((value) =>
        Number.isFinite(value)
      );

    const cycleValues = trendData
      .map((item) =>
        Number(item.cycle)
      )
      .filter((value) =>
        Number.isFinite(value)
      );

    if (
      sohValues.length === 0 ||
      cycleValues.length === 0
    ) {
      return (
        <div className="loading-message">
          Invalid trend data.
        </div>
      );
    }

    const minSOH =
      Math.floor(
        Math.min(...sohValues) - 2
      );

    const maxSOH =
      Math.ceil(
        Math.max(...sohValues) + 2
      );

    const minCycle =
      Math.min(...cycleValues);

    const maxCycle =
      Math.max(...cycleValues);

    const cycleRange =
      maxCycle - minCycle || 1;

    const sohRange =
      maxSOH - minSOH || 1;

    const points = trendData
      .map((item) => {

        const cycle =
          Number(item.cycle);

        const soh =
          Number(item.soh_percent);

        if (
          !Number.isFinite(cycle) ||
          !Number.isFinite(soh)
        ) {
          return null;
        }

        const x =
          paddingLeft +
          ((cycle - minCycle) /
            cycleRange) *
            graphWidth;

        const y =
          paddingTop +
          ((maxSOH - soh) /
            sohRange) *
            graphHeight;

        return `${x},${y}`;

      })
      .filter(Boolean)
      .join(" ");

    return (
      <div className="trend-chart-wrapper">

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trend-chart"
        >

          {[0, 1, 2, 3, 4].map(
            (index) => {

              const y =
                paddingTop +
                (graphHeight / 4) *
                  index;

              const value =
                maxSOH -
                (sohRange / 4) *
                  index;

              return (
                <g key={index}>

                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={
                      width -
                      paddingRight
                    }
                    y2={y}
                    stroke="#1e2732"
                  />

                  <text
                    x={
                      paddingLeft - 10
                    }
                    y={y + 4}
                    textAnchor="end"
                    fontSize="12"
                    fill="#657286"
                  >
                    {value.toFixed(0)}%
                  </text>

                </g>
              );
            }
          )}

          <line
            x1={paddingLeft}
            y1={
              height -
              paddingBottom
            }
            x2={
              width -
              paddingRight
            }
            y2={
              height -
              paddingBottom
            }
            stroke="#3a4553"
          />

          <polyline
            points={points}
            fill="none"
            stroke="#2fe0ad"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          <text
            x={paddingLeft}
            y={height - 15}
            fontSize="12"
            fill="#657286"
          >
            Cycle {minCycle}
          </text>

          <text
            x={
              width -
              paddingRight
            }
            y={height - 15}
            textAnchor="end"
            fontSize="12"
            fill="#657286"
          >
            Cycle {maxCycle}
          </text>

          <text
            x={width / 2}
            y={height - 2}
            textAnchor="middle"
            fontSize="13"
            fill="#8a94a3"
          >
            Battery Cycle
          </text>

          <text
            x="15"
            y={height / 2}
            textAnchor="middle"
            fontSize="13"
            fill="#8a94a3"
            transform={`rotate(-90 15 ${
              height / 2
            })`}
          >
            SOH (%)
          </text>

        </svg>

      </div>
    );
  };

  // ============================================================
  // ANALYTICS PAGE
  // ============================================================

  const renderAnalyticsPage = () => {
    const fleetVehicles = Array.isArray(fleet?.fleet) ? fleet.fleet : [];
    const validVehicles = fleetVehicles.filter((v) => Number.isFinite(Number(v.current_soh_percent)));

    const avgSOH = validVehicles.length
      ? validVehicles.reduce((sum, v) => sum + Number(v.current_soh_percent), 0) / validVehicles.length
      : 0;
    const avgDegradation = validVehicles.length
      ? validVehicles.reduce((sum, v) => sum + Number(v.degradation_percent || 0), 0) / validVehicles.length
      : 0;

    const bySOH = [...validVehicles].sort((a, b) => Number(b.current_soh_percent) - Number(a.current_soh_percent));
    const byDegradation = [...validVehicles].sort((a, b) => Number(b.degradation_percent || 0) - Number(a.degradation_percent || 0));
    const byPriority = [...validVehicles].sort((a, b) => Number(b.priority_score || 0) - Number(a.priority_score || 0));

    const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    validVehicles.forEach((v) => {
      const risk = String(v.risk_level || '').toLowerCase();
      if (risk === 'critical') riskCounts.critical++;
      else if (risk === 'high') riskCounts.high++;
      else if (risk === 'medium') riskCounts.medium++;
      else riskCounts.low++;
    });

    const maxDegradation = Math.max(1, ...byDegradation.map((v) => Number(v.degradation_percent || 0)));
    const maxPriority = Math.max(1, ...byPriority.map((v) => Number(v.priority_score || 0)));

    const riskClass = (risk) => {
      const value = String(risk || '').toLowerCase();
      if (value === 'critical') return 'analytics-critical';
      if (value === 'high') return 'analytics-high';
      if (value === 'medium') return 'analytics-medium';
      return 'analytics-low';
    };

    const riskColor = (risk) => {
      const value = String(risk || '').toLowerCase();
      if (value === 'critical') return '#ef5350';
      if (value === 'high') return '#f07842';
      if (value === 'medium') return '#f3b63f';
      return '#2fe0ad';
    };

    const refreshAnalytics = async () => {
      try {
        setLoadingFleet(true);
        const fleetResponse = await fetch(`${API_URL}/fleet`);
        if (fleetResponse.ok) setFleet(await fleetResponse.json());
        await loadMaintenance();
      } catch (err) {
        console.error('Analytics refresh error:', err);
      } finally {
        setLoadingFleet(false);
      }
    };

    return (
      <div className="fleet-page">
        <div className="page-heading">
          <div>
            <h1>Fleet Analytics</h1>
            <p>Understand battery health, degradation, and maintenance risk across your EV fleet.</p>
          </div>
          <button className="refresh-fleet-button" onClick={refreshAnalytics} disabled={loadingFleet || loadingMaintenance}>
            {loadingFleet || loadingMaintenance ? '⏳ Refreshing...' : '↻ Refresh Analytics'}
          </button>
        </div>

        {loadingFleet && !fleet ? (
          <div className="fleet-loading">Loading fleet analytics...</div>
        ) : validVehicles.length === 0 ? (
          <div className="fleet-error">No fleet data is available yet. Add a vehicle to start analytics.</div>
        ) : (
          <>
            <section className="fleet-summary-grid">
              <div className="fleet-summary-card">
                <span>Fleet Average SOH</span>
                <strong>{avgSOH.toFixed(2)}%</strong>
                <small>Average current battery health</small>
              </div>
              <div className="fleet-summary-card">
                <span>Average Degradation</span>
                <strong>{avgDegradation.toFixed(2)}%</strong>
                <small>Average observed degradation</small>
              </div>
              <div className="fleet-summary-card">
                <span>Best Battery</span>
                <strong>{Number(bySOH[0].current_soh_percent).toFixed(2)}%</strong>
                <small>{bySOH[0].battery_id} highest SOH</small>
              </div>
              <div className="fleet-summary-card critical-summary">
                <span>Top Priority</span>
                <strong>{byPriority[0]?.priority_score ?? 0}</strong>
                <small>{byPriority[0]?.battery_id || '--'} needs most attention</small>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.35fr) minmax(300px, 0.85fr)', gap: '24px', marginTop: '24px' }}>
              <div className="fleet-card">
                <div className="fleet-card-header">
                  <div><h2>Current SOH by Vehicle</h2><p>Compare the latest battery health across the fleet.</p></div>
                </div>
                <div style={{ paddingTop: '10px' }}>
                  {bySOH.map((v) => {
                    const soh = Number(v.current_soh_percent);
                    return (
                      <div key={v.battery_id} style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontWeight: 600 }}>
                          <button className="vehicle-link" onClick={() => openVehicleFromFleet(v.battery_id)}>{v.battery_id}</button>
                          <span>{soh.toFixed(2)}%</span>
                        </div>
                        <div style={{ height: '12px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.max(0, Math.min(100, soh))}%`, height: '100%', borderRadius: '999px', background: '#2fe0ad' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="fleet-card">
                <div className="fleet-card-header">
                  <div><h2>Risk Overview</h2><p>Vehicles grouped by maintenance risk.</p></div>
                </div>
                <div style={{ paddingTop: '12px' }}>
                  {[['Low', riskCounts.low, 'analytics-low'], ['Medium', riskCounts.medium, 'analytics-medium'], ['High', riskCounts.high, 'analytics-high'], ['Critical', riskCounts.critical, 'analytics-critical']].map(([label, count, cls]) => (
                    <div key={label} style={{ display: 'grid', gridTemplateColumns: '75px 1fr 35px', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <span style={{ fontWeight: 600 }}>{label}</span>
                      <div style={{ height: '14px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
                        <div style={{ width: `${validVehicles.length ? (count / validVehicles.length) * 100 : 0}%`, height: '100%', borderRadius: '999px', background: cls === 'analytics-critical' ? '#ef5350' : cls === 'analytics-high' ? '#f07842' : cls === 'analytics-medium' ? '#f3b63f' : '#2fe0ad' }} />
                      </div>
                      <strong style={{ textAlign: 'right' }}>{count}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '24px', marginTop: '24px' }}>
              <div className="fleet-card">
                <div className="fleet-card-header"><div><h2>Battery Degradation</h2><p>Vehicles with the greatest observed degradation.</p></div></div>
                <div style={{ paddingTop: '10px' }}>
                  {byDegradation.map((v) => {
                    const value = Number(v.degradation_percent || 0);
                    return (
                      <div key={v.battery_id} style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px', fontWeight: 600 }}><span>{v.battery_id}</span><span>{value.toFixed(2)}%</span></div>
                        <div style={{ height: '12px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}><div style={{ width: `${(value / maxDegradation) * 100}%`, height: '100%', borderRadius: '999px', background: '#f3b63f' }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="fleet-card">
                <div className="fleet-card-header"><div><h2>Maintenance Priority</h2><p>Vehicles that should receive attention first.</p></div></div>
                <div style={{ paddingTop: '10px' }}>
                  {byPriority.map((v, index) => {
                    const priority = Number(v.priority_score || 0);
                    const cls = riskClass(v.risk_level);
                    return (
                      <div key={v.battery_id} style={{ marginBottom: '18px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}><strong>#{index + 1}</strong><button className="vehicle-link" onClick={() => openVehicleFromFleet(v.battery_id)}>{v.battery_id}</button></div>
                          <span style={{ fontWeight: 700, color: riskColor(v.risk_level) }}>{v.risk_level || 'LOW'} · {priority}</span>
                        </div>
                        <div style={{ height: '12px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}><div style={{ width: `${(priority / maxPriority) * 100}%`, height: '100%', borderRadius: '999px', background: riskColor(v.risk_level) }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="fleet-card" style={{ marginTop: '24px' }}>
              <div className="fleet-card-header"><div><h2>Fleet Health Summary</h2><p>Current health, predicted health, degradation, and risk for every vehicle.</p></div><div className="fleet-count">{validVehicles.length} vehicles</div></div>
              <div className="fleet-table-wrapper">
                <table className="fleet-table">
                  <thead><tr><th>Vehicle</th><th>Current SOH</th><th>Predicted SOH</th><th>Change</th><th>Degradation</th><th>Risk</th></tr></thead>
                  <tbody>
                    {[...validVehicles].sort((a, b) => Number(a.current_soh_percent) - Number(b.current_soh_percent)).map((v) => {
                      const current = Number(v.current_soh_percent);
                      const predicted = Number(v.predicted_soh_percent);
                      const change = Number.isFinite(predicted) ? predicted - current : null;
                      return (
                        <tr key={`analytics-${v.battery_id}`}>
                          <td><button className="vehicle-link" onClick={() => openVehicleFromFleet(v.battery_id)}><strong>{v.battery_id}</strong></button></td>
                          <td><strong>{current.toFixed(2)}%</strong></td>
                          <td>{Number.isFinite(predicted) ? `${predicted.toFixed(2)}%` : '--'}</td>
                          <td>{change !== null ? `${change >= 0 ? '+' : ''}${change.toFixed(2)}%` : '--'}</td>
                          <td>{Number(v.degradation_percent || 0).toFixed(2)}%</td>
                          <td><span style={{ fontWeight: 700, color: riskColor(v.risk_level) }}>{v.risk_level || 'LOW'}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    );
  };

  // ============================================================
  // MAIN UI
  // ============================================================

  const currentSOH = trend?.current_soh_percent != null ? Number(trend.current_soh_percent) : null;
  const packCells = buildPackCells(currentSOH ?? 100);

  return (
    <div className="app">

      {/* SIDEBAR */}

      <aside className="sidebar">

        <div className="logo">

          <span>⚡</span>

          <div>
            <strong>EV</strong>
            <br />
            Battery
          </div>

        </div>

        <nav>

          <button
            className={`nav-item ${
              activePage === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            {NAV_ICONS.dashboard}
            Dashboard
          </button>

          <button
            className={`nav-item ${
              activePage === "prediction"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("prediction")
            }
          >
            {NAV_ICONS.prediction}
            Battery Prediction
          </button>

          <button
            className={`nav-item ${
              activePage === "fleet"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("fleet")
            }
          >
            {NAV_ICONS.fleet}
            Fleet Monitoring
          </button>

          <button
            className={`nav-item ${
              activePage === "addVehicle"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("addVehicle")
            }
          >
            {NAV_ICONS.addVehicle}
            Add Vehicle
          </button>

          <button
            className={`nav-item ${
              activePage === "maintenance"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("maintenance")
            }
          >
            {NAV_ICONS.maintenance}
            Maintenance
          </button>

          <button
            className={`nav-item ${
              activePage === "realtime" ? "active" : ""
            }`}
            onClick={() => setActivePage("realtime")}
          >
            {NAV_ICONS.realtime}
            Live Telemetry
          </button>

          <button
            className={`nav-item ${
              activePage === "analytics" ? "active" : ""
            }`}
            onClick={() =>
              setActivePage("analytics")
            }
          >
            {NAV_ICONS.analytics}
            Analytics
          </button>

          <button
            className={`nav-item ${
              activePage === "map" ? "active" : ""
            }`}
            onClick={() => {
              setActivePage("map");
              navigateToPage("map");
            }}
          >
            {NAV_ICONS.map}
            Charging Map
          </button>

        </nav>

      </aside>

      {/* MAIN */}

      <main className="main">

        {/* HEADER */}

        <header className="header">

          <div>

            <h1>
              EV Battery Intelligence
            </h1>

            <p>
              AI-powered battery health
              and predictive maintenance
            </p>

          </div>

          <div className="status">

            <span className="status-dot"></span>

            {loadingVehicles
              ? "Connecting..."
              : "API Connected"}

          </div>

        </header>

        {/* =====================================================
            FLEET PAGE
        ===================================================== */}

        {activePage === "realtime" ? (

          renderRealtimePage()

        ) : activePage === "fleet" ? (

          renderFleetPage()

        ) : activePage === "analytics" ? (

          renderAnalyticsPage()

        ) : activePage === "addVehicle" ? (

          renderAddVehiclePage()

        ) : activePage === "maintenance" ? (

          renderMaintenancePage()

        ) : activePage === "map" ? (

          <MapPage
            battery={battery}
            selectedVehicle={selectedVehicle}
          />

        ) : (

          <>

            {/* VEHICLE SELECTOR */}

            <section className="vehicle-selector-card">

              <div>

                <label>
                  Select Vehicle
                </label>

                <p>
                  Battery parameters are
                  loaded automatically from
                  the dataset.
                </p>

              </div>

              <select
                value={selectedVehicle}
                onChange={(e) =>
                  setSelectedVehicle(
                    e.target.value
                  )
                }
                disabled={
                  loadingVehicles ||
                  loadingBattery ||
                  vehicles.length === 0
                }
              >

                {vehicles.length === 0 ? (

                  <option>
                    No vehicles available
                  </option>

                ) : (

                  vehicles.map(
                    (vehicle) => (

                      <option
                        key={vehicle}
                        value={vehicle}
                      >
                        {vehicle}
                      </option>

                    )
                  )

                )}

              </select>

            </section>

            {/* STATS */}

            <section className="stats">

              <div className="stat-card">

                <span>
                  Current SOH
                </span>

                <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>

                  <div
                    className="mini-ring"
                    style={{
                      background: `conic-gradient(#2fe0ad ${
                        (currentSOH ?? 0) * 3.6
                      }deg, #1c2530 0deg)`,
                    }}
                  >
                    <div className="mini-ring-inner"></div>
                  </div>

                  <div>
                    <strong style={{ margin: 0 }}>
                      {currentSOH != null ? `${currentSOH.toFixed(2)}%` : "--"}
                    </strong>
                    <small>
                      State of Health
                    </small>
                  </div>

                </div>

              </div>

              <div className="stat-card">

                <span>
                  Battery Cycle
                </span>

                <strong>
                  {getValue("cycle")}
                </strong>

                <small>
                  Latest recorded cycle
                </small>

              </div>

              <div className="stat-card">

                <span>
                  Battery Capacity
                </span>

                <strong>
                  {getValue("capacity_Ah")} Ah
                </strong>

                <small>
                  Current capacity
                </small>

              </div>

            </section>

            {/* TREND + DEGRADATION */}

            <section className="content-grid">

              <div className="card">

                <h2>
                  Battery SOH Trend
                </h2>

                <p className="card-description">

                  State of Health degradation
                  across battery cycles for{" "}

                  <strong>
                    {selectedVehicle || "--"}
                  </strong>

                </p>

                {renderTrendGraph()}

              </div>

              <div className="card">

                <h2>
                  Degradation Summary
                </h2>

                <div className="form-grid">

                  <div className="input-group">

                    <label>
                      Initial SOH
                    </label>

                    <input
                      type="text"
                      value={
                        trend?.initial_soh_percent != null
                          ? `${Number(
                              trend.initial_soh_percent
                            ).toFixed(2)}%`
                          : "--"
                      }
                      readOnly
                    />

                  </div>

                  <div className="input-group">

                    <label>
                      Current SOH
                    </label>

                    <input
                      type="text"
                      value={
                        trend?.current_soh_percent != null
                          ? `${Number(
                              trend.current_soh_percent
                            ).toFixed(2)}%`
                          : "--"
                      }
                      readOnly
                    />

                  </div>

                  <div className="input-group">

                    <label>
                      Degradation
                    </label>

                    <input
                      type="text"
                      value={(() => {

                        const value =
                          trend?.soh_degradation_percent ??
                          trend?.degradation_percentage ??
                          trend?.degradation_percent;

                        if (
                          value !== undefined &&
                          value !== null &&
                          Number.isFinite(
                            Number(value)
                          )
                        ) {
                          return `${Math.abs(
                            Number(value)
                          ).toFixed(2)}%`;
                        }

                        const initial =
                          trend?.initial_soh_percent != null
                            ? Number(
                                trend.initial_soh_percent
                              )
                            : null;

                        const current =
                          trend?.current_soh_percent != null
                            ? Number(
                                trend.current_soh_percent
                              )
                            : null;

                        if (
                          initial !== null &&
                          current !== null &&
                          Number.isFinite(initial) &&
                          Number.isFinite(current)
                        ) {
                          return `${Math.abs(
                            initial - current
                          ).toFixed(2)}%`;
                        }

                        return "--";

                      })()}
                      readOnly
                    />

                  </div>

                  <div className="input-group">

                    <label>
                      Total Records
                    </label>

                    <input
                      type="text"
                      value={
                        trend?.total_records ??
                        "--"
                      }
                      readOnly
                    />

                  </div>

                </div>

              </div>

            </section>

            {/* BATTERY PARAMETERS + PREDICTION */}

            <section className="content-grid">

              <div className="card input-card">

                <h2>
                  Battery Parameters
                </h2>

                <p className="card-description">

                  Dataset values for vehicle{" "}

                  <strong>
                    {selectedVehicle || "--"}
                  </strong>

                </p>

                {loadingBattery ? (

                  <div className="loading-message">
                    Loading battery data...
                  </div>

                ) : (

                  <div className="form-grid">

                    {DISPLAY_FIELDS.map(
                      ([field, label, step]) => (

                        <div
                          className="input-group"
                          key={field}
                        >

                          <label>
                            {label}
                          </label>

                          <input
                            type="number"
                            step={step}
                            name={field}
                            value={getValue(field)}
                            readOnly
                          />

                        </div>

                      )
                    )}

                  </div>

                )}

                {error && (

                  <div className="error-message">
                    ⚠️ {error}
                  </div>

                )}

                <button
                  className="predict-button"
                  onClick={handlePredict}
                  disabled={
                    loadingPrediction ||
                    loadingBattery ||
                    !selectedVehicle
                  }
                >

                  {loadingPrediction
                    ? "⏳ Analyzing Battery..."
                    : "⚡ Predict Battery SOH"}

                </button>

              </div>

              <div className="card prediction-card">

                <h2>
                  Battery Health Prediction
                </h2>

                {prediction !== null ? (

                  <>

                    <div
                      className="health-circle"
                      style={{
                        background: `
                          radial-gradient(
                            circle at center,
                            #0a0f15 57%,
                            transparent 58%
                          ),
                          conic-gradient(
                            #2fe0ad 0deg,
                            #58f0c4 ${
                              animatedPrediction *
                              3.6
                            }deg,
                            #1c2530 ${
                              animatedPrediction *
                              3.6
                            }deg,
                            #1c2530 360deg
                          )
                        `,
                      }}
                    >

                      <div>

                        <strong>
                          {animatedPrediction}%
                        </strong>

                        <span>
                          SOH
                        </span>

                      </div>

                    </div>

                    {healthStatus && (

                      <div
                        className={`health-status ${healthStatus.className}`}
                      >

                        <span className="health-indicator"></span>

                        {healthStatus.text}

                      </div>

                    )}

                    <p>
                      {healthStatus?.message}
                    </p>

                    <p>

                      The AI model estimates
                      the current battery
                      State of Health at{" "}

                      <strong>
                        {animatedPrediction}%
                      </strong>.

                    </p>

                    {predictionDetails?.actual_soh_percent != null && (

                      <p>

                        Actual recorded SOH:{" "}

                        <strong>
                          {Number(
                            predictionDetails.actual_soh_percent
                          ).toFixed(2)}%
                        </strong>

                      </p>

                    )}

                    {predictionDetails?.prediction_error_percent != null && (

                      <p>

                        Prediction error:{" "}

                        <strong>
                          {Number(
                            predictionDetails.prediction_error_percent
                          ).toFixed(2)}%
                        </strong>

                      </p>

                    )}


                  </>

                ) : (

                  <div className="no-prediction">

                    <div className="battery-icon">
                      🔋
                    </div>

                    <h3>
                      No Prediction Yet
                    </h3>

                    <p>

                      Select a vehicle and
                      click{" "}

                      <b>
                        Predict Battery SOH
                      </b>{" "}

                      to analyze the battery.

                    </p>

                  </div>

                )}

              </div>

            </section>

            {/* BATTERY PACK HEALTH — hero visualization */}

            <section className="card" style={{ maxWidth: 1320, margin: "0 auto 16px" }}>

              <h2>Battery Pack Health</h2>
              <p className="card-description">
                Estimated per-module condition for{" "}
                <strong>{selectedVehicle || "--"}</strong>, derived from
                aggregate State of Health — not individual cell telemetry.
              </p>

              <div className="pack-grid">
                {packCells.map((status, index) => (
                  <div
                    key={index}
                    className={`cell ${status}`}
                    title={`Module ${index + 1}: ${status}`}
                  />
                ))}
              </div>

              <div className="pack-legend">
                <div className="pack-legend-item">
                  <span className="pack-legend-dot" style={{ background: "#2fe0ad" }}></span>
                  Healthy
                </div>
                <div className="pack-legend-item">
                  <span className="pack-legend-dot" style={{ background: "#f3b63f" }}></span>
                  Monitor
                </div>
                <div className="pack-legend-item">
                  <span className="pack-legend-dot" style={{ background: "#ef5350" }}></span>
                  Critical
                </div>
              </div>

            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default App;