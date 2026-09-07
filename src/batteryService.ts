import fs from "fs";
import path from "path";
import modelParams from "./model_params.json";

export interface BatteryRecord {
  battery_id: string;
  cycle: number;
  voltage_mean: number;
  voltage_min: number;
  voltage_max: number;
  voltage_std: number;
  voltage_range: number;
  current_mean: number;
  current_min: number;
  current_max: number;
  current_std: number;
  temperature_mean: number;
  temperature_min: number;
  temperature_max: number;
  temperature_std: number;
  discharge_duration: number;
  capacity_Ah: number;
  initial_capacity_Ah: number;
  SOH_percent: number;
  SOH_change?: number;
  capacity_change?: number;
  SOH_degradation_rate?: number;
  capacity_degradation_rate?: number;
  cycle_progress?: number;
  [key: string]: any;
}

export interface RiskAnalysis {
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN";
  risk_score: number;
  priority_score: number;
  maintenance_required: boolean;
  recommendation: string;
  reason: string;
  risk_factors: string[];
  current_soh_percent: number | null;
  degradation_percent: number | null;
  predicted_soh_percent: number | null;
  prediction_error_percent?: number | null;
  temperature_max?: number | null;
  temperature_mean?: number | null;
  cycle?: number | null;
  battery_id?: string;
}

const FEATURE_NAMES = modelParams.featureNames;
const FEATURE_STATS = modelParams.featureStats as Record<string, { mean: number; std: number }>;
const MODEL_WEIGHTS = modelParams.modelWeights as { intercept: number; coefficients: Record<string, number> };

let inMemoryDatabase: BatteryRecord[] = [];

export function loadDatabase(): BatteryRecord[] {
  if (inMemoryDatabase.length > 0) {
    return inMemoryDatabase;
  }

  const csvPath = path.resolve(process.cwd(), "data", "processed", "battery_ml_degradation_features.csv");
  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, "utf-8").trim();
  const lines = content.split(/\r?\n/);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const records: BatteryRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const values = row.split(",");
    const record: any = {};
    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const val = values[j]?.trim();
      if (header === "battery_id") {
        record[header] = val ? val.toUpperCase() : "UNKNOWN";
      } else {
        const num = parseFloat(val);
        record[header] = isNaN(num) ? 0 : num;
      }
    }
    records.push(record as BatteryRecord);
  }

  // Sort by battery_id and cycle
  records.sort((a, b) => {
    if (a.battery_id === b.battery_id) {
      return a.cycle - b.cycle;
    }
    return a.battery_id.localeCompare(b.battery_id);
  });

  inMemoryDatabase = records;
  return inMemoryDatabase;
}

export function getFeatureNames(): string[] {
  return FEATURE_NAMES;
}

export function predictSoh(features: Record<string, number>): number {
  let scaledSum = MODEL_WEIGHTS.intercept;
  for (const feat of FEATURE_NAMES) {
    const rawVal = features[feat] !== undefined ? features[feat] : (FEATURE_STATS[feat]?.mean ?? 0);
    const stat = FEATURE_STATS[feat];
    const std = stat && stat.std > 1e-7 ? stat.std : 1;
    const mean = stat ? stat.mean : 0;
    const scaled = (rawVal - mean) / std;
    const coef = MODEL_WEIGHTS.coefficients[feat] || 0;
    scaledSum += scaled * coef;
  }
  return Math.max(0, Math.min(100, Math.round(scaledSum * 100) / 100));
}

export function calculateMaintenanceRisk(
  currentSoh: number | null,
  degradation: number | null,
  predictedSoh: number | null = null,
  predictionError: number | null = null,
  temperatureMax: number | null = null,
  temperatureMean: number | null = null,
  cycle: number | null = null
): Omit<RiskAnalysis, "priority_score" | "battery_id"> {
  if (currentSoh === null || isNaN(currentSoh)) {
    return {
      risk_level: "UNKNOWN",
      risk_score: 0,
      maintenance_required: false,
      recommendation: "Insufficient battery health data.",
      reason: "Current SOH is unavailable.",
      risk_factors: [],
      current_soh_percent: null,
      degradation_percent: null,
      predicted_soh_percent: null,
    };
  }

  let score = 0;
  const riskFactors: string[] = [];

  // 1. SOH scoring
  if (currentSoh < 60) {
    score += 50;
    riskFactors.push("Very low State of Health");
  } else if (currentSoh < 70) {
    score += 35;
    riskFactors.push("Low State of Health");
  } else if (currentSoh < 80) {
    score += 20;
    riskFactors.push("Moderately degraded State of Health");
  } else if (currentSoh < 90) {
    score += 10;
  }

  // 2. Degradation
  const deg = degradation ?? 0;
  if (deg >= 40) {
    score += 30;
    riskFactors.push("Severe capacity degradation");
  } else if (deg >= 30) {
    score += 25;
    riskFactors.push("High battery degradation");
  } else if (deg >= 20) {
    score += 15;
    riskFactors.push("Significant battery degradation");
  } else if (deg >= 10) {
    score += 5;
    riskFactors.push("Early battery degradation");
  }

  // 3. Max Temperature
  if (temperatureMax !== null && !isNaN(temperatureMax)) {
    if (temperatureMax >= 45) {
      score += 25;
      riskFactors.push("High peak battery temperature");
    } else if (temperatureMax >= 40) {
      score += 15;
      riskFactors.push("Elevated peak battery temperature");
    } else if (temperatureMax >= 35) {
      score += 5;
    }
  }

  // 4. Mean Temperature
  if (temperatureMean !== null && !isNaN(temperatureMean)) {
    if (temperatureMean >= 35) {
      score += 15;
      riskFactors.push("High average battery temperature");
    } else if (temperatureMean >= 30) {
      score += 5;
    }
  }

  // 5. Predicted SOH
  if (predictedSoh !== null && !isNaN(predictedSoh)) {
    if (predictedSoh < 60) {
      score += 20;
      riskFactors.push("Predicted SOH is critically low");
    } else if (predictedSoh < 70) {
      score += 10;
      riskFactors.push("Predicted SOH indicates future attention");
    }
  }

  // 6. Prediction Error
  if (predictionError !== null && !isNaN(predictionError) && Math.abs(predictionError) >= 5) {
    score += 10;
    riskFactors.push("Large difference between actual and predicted SOH");
  }

  // 7. Cycle count
  if (cycle !== null && !isNaN(cycle)) {
    if (cycle >= 600) {
      score += 10;
      riskFactors.push("Very high cycle count");
    } else if (cycle >= 500) {
      score += 5;
      riskFactors.push("High cycle count");
    }
  }

  score = Math.min(score, 100);

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  let maintenanceRequired = false;
  let recommendation = "Continue normal operation and routine monitoring.";

  if (score >= 75) {
    riskLevel = "CRITICAL";
    maintenanceRequired = true;
    recommendation = "Immediate battery inspection recommended.";
  } else if (score >= 50) {
    riskLevel = "HIGH";
    maintenanceRequired = true;
    recommendation = "Schedule preventive battery maintenance.";
  } else if (score >= 25) {
    riskLevel = "MEDIUM";
    maintenanceRequired = true;
    recommendation = "Monitor battery closely and schedule inspection.";
  } else {
    riskLevel = "LOW";
  }

  const reason = riskFactors.length > 0
    ? riskFactors.slice(0, 3).join("; ")
    : "Battery health indicators are currently within acceptable operating conditions.";

  return {
    risk_level: riskLevel,
    risk_score: score,
    maintenance_required: maintenanceRequired,
    recommendation,
    reason,
    risk_factors: riskFactors,
    current_soh_percent: Math.round(currentSoh * 100) / 100,
    degradation_percent: Math.round(deg * 100) / 100,
    predicted_soh_percent: predictedSoh !== null ? Math.round(predictedSoh * 100) / 100 : null,
    prediction_error_percent: predictionError !== null ? Math.round(predictionError * 100) / 100 : null,
    temperature_max: temperatureMax !== null ? Math.round(temperatureMax * 100) / 100 : null,
    temperature_mean: temperatureMean !== null ? Math.round(temperatureMean * 100) / 100 : null,
    cycle,
  };
}

export function calculatePriorityScore(
  riskScore: number,
  currentSoh: number | null,
  degradation: number | null
): number {
  let sohPenalty = 0;
  if (currentSoh !== null && !isNaN(currentSoh)) {
    if (currentSoh < 60) sohPenalty = 30;
    else if (currentSoh < 70) sohPenalty = 20;
    else if (currentSoh < 80) sohPenalty = 10;
  }

  let degPenalty = 0;
  if (degradation !== null && !isNaN(degradation)) {
    if (degradation >= 40) degPenalty = 20;
    else if (degradation >= 30) degPenalty = 15;
    else if (degradation >= 20) degPenalty = 10;
    else if (degradation >= 10) degPenalty = 5;
  }

  const priority = (riskScore || 0) + sohPenalty + degPenalty;
  return Math.round(Math.min(priority, 100) * 100) / 100;
}

export function calculateRul(records: BatteryRecord[]) {
  if (!records || records.length < 2) {
    return {
      status: "insufficient_data",
      remaining_useful_life_cycles: null,
      rul_status: "UNKNOWN",
    };
  }

  const validRecords = records.filter(
    (r) => r.SOH_percent !== undefined && !isNaN(r.SOH_percent) && r.cycle !== undefined
  );

  if (validRecords.length < 2) {
    return {
      status: "insufficient_data",
      remaining_useful_life_cycles: null,
      rul_status: "UNKNOWN",
    };
  }

  const n = validRecords.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const r of validRecords) {
    const x = r.cycle;
    const y = r.SOH_percent;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
    sumY2 += y * y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;
  const intercept = (sumY - slope * sumX) / n;

  // Pearson R^2
  const numeratorR = n * sumXY - sumX * sumY;
  const denomR = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  const rSquared = denomR !== 0 ? Math.pow(numeratorR / denomR, 2) : 0;

  const latest = validRecords[validRecords.length - 1];
  const currentCycle = latest.cycle;
  const currentSoh = latest.SOH_percent;
  const eolThreshold = 70.0;

  // Use empirical regression slope if negative, otherwise calibrated NMC cell baseline slope (-0.028% / cycle)
  const effectiveSlope = slope < -0.0005 ? slope : -0.028;

  let estimatedEolCycle: number | null = null;
  let remainingCycles: number | null = null;

  if (slope < -0.0005) {
    estimatedEolCycle = (eolThreshold - intercept) / slope;
    remainingCycles = Math.max(0, Math.round(estimatedEolCycle - currentCycle));
  } else {
    // Fallback based on remaining SOH capacity gap and effective degradation rate
    const remainingSohSpan = Math.max(0, currentSoh - eolThreshold);
    remainingCycles = Math.round(remainingSohSpan / Math.abs(effectiveSlope));
    estimatedEolCycle = currentCycle + remainingCycles;
  }

  let rulStatus = "NORMAL";
  let urgency = "ROUTINE MONITORING";
  if (currentSoh <= 70 || (remainingCycles !== null && remainingCycles <= 35)) {
    rulStatus = "CRITICAL";
    urgency = "IMMEDIATE REPLACEMENT";
  } else if (currentSoh < 76 || (remainingCycles !== null && remainingCycles < 85)) {
    rulStatus = "ATTENTION";
    urgency = "SCHEDULE REPLACEMENT";
  } else if (currentSoh >= 88 && (remainingCycles === null || remainingCycles > 250)) {
    rulStatus = "EXCELLENT";
    urgency = "OPTIMAL LIFESPAN";
  }

  const confidence = rSquared >= 0.85 ? "HIGH" : rSquared >= 0.60 ? "MEDIUM" : "CALIBRATED";

  // Real-world operational fleet projections: ~380 km / cycle, ~1.1 cycles / day
  const KM_PER_CYCLE = 380;
  const CYCLES_PER_DAY = 1.1;

  const estimatedRemainingKm = remainingCycles !== null ? Math.round(remainingCycles * KM_PER_CYCLE) : null;
  const estimatedRemainingDays = remainingCycles !== null ? Math.round(remainingCycles / CYCLES_PER_DAY) : null;
  const estimatedRemainingMonths = estimatedRemainingDays !== null ? +(estimatedRemainingDays / 30.4).toFixed(1) : null;

  // Estimated EOL date projection
  let estimatedEolDate: string | null = null;
  if (estimatedRemainingDays !== null) {
    const eolDateObj = new Date();
    eolDateObj.setDate(eolDateObj.getDate() + estimatedRemainingDays);
    estimatedEolDate = eolDateObj.toISOString().split("T")[0];
  }

  // Lifecycle progress (percentage of expected lifecycle consumed)
  const totalLifecycleCycles = (estimatedEolCycle && estimatedEolCycle > 0) ? estimatedEolCycle : (currentCycle + (remainingCycles || 500));
  const lifecycleConsumedPercent = Math.min(100, Math.max(0, Math.round((currentCycle / totalLifecycleCycles) * 100)));
  const lifecycleRemainingPercent = 100 - lifecycleConsumedPercent;

  // Projections
  const projections = [];
  const futureIntervals = [10, 25, 50, 100, 150];
  for (const int of futureIntervals) {
    const projCycle = currentCycle + int;
    const projSoh = Math.max(0, Math.min(100, intercept + slope * projCycle));
    projections.push({
      cycle: projCycle,
      projected_soh_percent: Math.round(projSoh * 10) / 10,
      projected_remaining_km: remainingCycles !== null ? Math.max(0, (remainingCycles - int) * KM_PER_CYCLE) : null,
    });
  }

  return {
    battery_id: latest.battery_id,
    current_cycle: currentCycle,
    current_soh_percent: Math.round(currentSoh * 100) / 100,
    eol_soh_threshold_percent: eolThreshold,
    degradation_rate_per_cycle: Math.round(Math.abs(effectiveSlope) * 10000) / 10000,
    slope: Math.round(effectiveSlope * 1000000) / 1000000,
    intercept: Math.round(intercept * 10000) / 10000,
    r_squared: Math.round(rSquared * 10000) / 10000,
    estimated_eol_cycle: estimatedEolCycle !== null ? Math.round(estimatedEolCycle) : null,
    remaining_useful_life_cycles: remainingCycles,
    estimated_remaining_km: estimatedRemainingKm,
    estimated_remaining_days: estimatedRemainingDays,
    estimated_remaining_months: estimatedRemainingMonths,
    estimated_eol_date: estimatedEolDate,
    lifecycle_consumed_percent: lifecycleConsumedPercent,
    lifecycle_remaining_percent: lifecycleRemainingPercent,
    rul_status: rulStatus,
    urgency,
    confidence,
    projections,
  };
}

export function addVehicleRecord(record: Partial<BatteryRecord>): BatteryRecord {
  const db = loadDatabase();
  const batteryId = (record.battery_id || "CUSTOM-1").toUpperCase();
  const vehicleRecords = db.filter((r) => r.battery_id === batteryId);
  const nextCycle = vehicleRecords.length > 0 ? vehicleRecords[vehicleRecords.length - 1].cycle + 1 : 1;

  const cycle = record.cycle !== undefined ? Number(record.cycle) : nextCycle;
  const initialCapacity = vehicleRecords.length > 0 ? vehicleRecords[0].capacity_Ah : Number(record.capacity_Ah || 1.85);
  const currentCapacity = Number(record.capacity_Ah || initialCapacity);
  const calculatedSoh = initialCapacity > 0 ? (currentCapacity / initialCapacity) * 100 : 100;

  const completeRecord: BatteryRecord = {
    battery_id: batteryId,
    cycle,
    voltage_mean: Number(record.voltage_mean || 3.5),
    voltage_min: Number(record.voltage_min || 2.5),
    voltage_max: Number(record.voltage_max || 4.2),
    voltage_std: Number(record.voltage_std || 0.24),
    voltage_range: Number(record.voltage_range || 1.7),
    current_mean: Number(record.current_mean || -1.82),
    current_min: Number(record.current_min || -2.01),
    current_max: Number(record.current_max || 0.002),
    current_std: Number(record.current_std || 0.59),
    temperature_mean: Number(record.temperature_mean || 32.5),
    temperature_min: Number(record.temperature_min || 24.5),
    temperature_max: Number(record.temperature_max || 38.8),
    temperature_std: Number(record.temperature_std || 3.4),
    discharge_duration: Number(record.discharge_duration || 3600),
    capacity_Ah: currentCapacity,
    initial_capacity_Ah: initialCapacity,
    SOH_percent: record.SOH_percent !== undefined ? Number(record.SOH_percent) : calculatedSoh,
    capacity_change: currentCapacity - initialCapacity,
    capacity_degradation_rate: initialCapacity > 0 ? (initialCapacity - currentCapacity) / cycle : 0,
    cycle_progress: cycle,
  };

  db.push(completeRecord);
  db.sort((a, b) => {
    if (a.battery_id === b.battery_id) return a.cycle - b.cycle;
    return a.battery_id.localeCompare(b.battery_id);
  });

  return completeRecord;
}
