from pathlib import Path

import numpy as np
import pandas as pd


# ============================================================
# MAINTENANCE DECISION MODEL
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATASET_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "battery_ml_degradation_features.csv"
)


# ============================================================
# THRESHOLDS
# ============================================================

SOH_HEALTHY = 80.0
SOH_GOOD = 60.0
SOH_CRITICAL = 60.0

DEGRADATION_WARNING = 20.0
DEGRADATION_CRITICAL = 35.0

TEMPERATURE_WARNING = 35.0
TEMPERATURE_CRITICAL = 45.0

CYCLE_WARNING = 500
CYCLE_CRITICAL = 600


# ============================================================
# LOAD DATASET
# ============================================================

try:
    df = pd.read_csv(DATASET_PATH)
except Exception as e:
    raise RuntimeError(
        f"Could not load battery dataset: {e}"
    )


# ============================================================
# BASIC CLEANING
# ============================================================

df["battery_id"] = (
    df["battery_id"]
    .astype(str)
    .str.strip()
    .str.upper()
)

df["cycle"] = pd.to_numeric(
    df["cycle"],
    errors="coerce"
)

df = df.dropna(
    subset=["battery_id", "cycle"]
)


# ============================================================
# HELPER
# ============================================================

def safe_float(value, default=0.0):
    try:
        if pd.isna(value):
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


# ============================================================
# MAINTENANCE ANALYSIS
# ============================================================

def analyze_battery(
    battery_id,
    predicted_soh=None
):

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    battery_data = df[
        df["battery_id"] == battery_id
    ].copy()

    if battery_data.empty:
        raise ValueError(
            f"Battery '{battery_id}' not found."
        )

    battery_data = (
        battery_data
        .sort_values("cycle")
        .reset_index(drop=True)
    )

    latest = battery_data.iloc[-1]

    # ========================================================
    # BASIC VALUES
    # ========================================================

    cycle = safe_float(
        latest.get("cycle")
    )

    current_soh = safe_float(
        latest.get("SOH_percent")
    )

    initial_soh = safe_float(
        battery_data.iloc[0].get("SOH_percent"),
        current_soh
    )

    capacity = safe_float(
        latest.get("capacity_Ah")
    )

    initial_capacity = safe_float(
        latest.get("initial_capacity_Ah")
    )

    temperature = safe_float(
        latest.get("temperature_mean")
    )

    current_mean = safe_float(
        latest.get("current_mean")
    )

    degradation_rate = safe_float(
        latest.get("capacity_degradation_rate")
    )

    cycle_progress = safe_float(
        latest.get("cycle_progress")
    )

    # ========================================================
    # DEGRADATION
    # ========================================================

    degradation_percent = max(
        0.0,
        initial_soh - current_soh
    )

    if initial_soh > 0:
        degradation_ratio = (
            degradation_percent
            / initial_soh
        ) * 100
    else:
        degradation_ratio = 0.0

    # ========================================================
    # RECENT SOH TREND
    # ========================================================

    recent_data = battery_data.tail(10)

    if len(recent_data) >= 2:

        first_recent_soh = safe_float(
            recent_data.iloc[0]["SOH_percent"],
            current_soh
        )

        last_recent_soh = safe_float(
            recent_data.iloc[-1]["SOH_percent"],
            current_soh
        )

        first_cycle = safe_float(
            recent_data.iloc[0]["cycle"],
            cycle
        )

        last_cycle = safe_float(
            recent_data.iloc[-1]["cycle"],
            cycle
        )

        cycle_difference = (
            last_cycle - first_cycle
        )

        if cycle_difference > 0:

            recent_soh_slope = (
                last_recent_soh
                - first_recent_soh
            ) / cycle_difference

        else:
            recent_soh_slope = 0.0

    else:
        recent_soh_slope = 0.0

    # ========================================================
    # RISK SCORE
    # ========================================================

    risk_score = 0.0

    reasons = []

    # --------------------------------------------------------
    # SOH CONTRIBUTION
    # --------------------------------------------------------

    if current_soh < 40:

        risk_score += 50

        reasons.append(
            "Battery SOH is critically low."
        )

    elif current_soh < 60:

        risk_score += 35

        reasons.append(
            "Battery SOH is below the recommended operating range."
        )

    elif current_soh < 80:

        risk_score += 15

        reasons.append(
            "Battery shows noticeable degradation."
        )

    # --------------------------------------------------------
    # DEGRADATION CONTRIBUTION
    # --------------------------------------------------------

    if degradation_ratio >= DEGRADATION_CRITICAL:

        risk_score += 25

        reasons.append(
            "Overall battery degradation is high."
        )

    elif degradation_ratio >= DEGRADATION_WARNING:

        risk_score += 15

        reasons.append(
            "Battery degradation requires monitoring."
        )

    # --------------------------------------------------------
    # TEMPERATURE CONTRIBUTION
    # --------------------------------------------------------

    if temperature >= TEMPERATURE_CRITICAL:

        risk_score += 15

        reasons.append(
            "Battery temperature is critically high."
        )

    elif temperature >= TEMPERATURE_WARNING:

        risk_score += 8

        reasons.append(
            "Battery temperature is elevated."
        )

    # --------------------------------------------------------
    # CYCLE CONTRIBUTION
    # --------------------------------------------------------

    if cycle >= CYCLE_CRITICAL:

        risk_score += 10

        reasons.append(
            "Battery has accumulated a high number of cycles."
        )

    elif cycle >= CYCLE_WARNING:

        risk_score += 5

        reasons.append(
            "Battery cycle count is becoming high."
        )

    # --------------------------------------------------------
    # RECENT DEGRADATION CONTRIBUTION
    # --------------------------------------------------------

    if recent_soh_slope < -0.05:

        risk_score += 15

        reasons.append(
            "Recent SOH trend indicates accelerated degradation."
        )

    elif recent_soh_slope < -0.01:

        risk_score += 7

        reasons.append(
            "Recent SOH is gradually decreasing."
        )

    # --------------------------------------------------------
    # CAPACITY CONTRIBUTION
    # --------------------------------------------------------

    if initial_capacity > 0:

        capacity_retention = (
            capacity
            / initial_capacity
        ) * 100

    else:
        capacity_retention = 100.0

    if capacity_retention < 60:

        risk_score += 20

        reasons.append(
            "Battery capacity retention is critically low."
        )

    elif capacity_retention < 80:

        risk_score += 10

        reasons.append(
            "Battery capacity retention has decreased."
        )

    # ========================================================
    # PREDICTED SOH
    # ========================================================

    if predicted_soh is not None:

        predicted_soh = safe_float(
            predicted_soh,
            current_soh
        )

        prediction_change = (
            predicted_soh
            - current_soh
        )

        if prediction_change < -3:

            risk_score += 15

            reasons.append(
                "AI prediction indicates further near-term degradation."
            )

    else:

        predicted_soh = None

    # ========================================================
    # LIMIT SCORE
    # ========================================================

    risk_score = max(
        0.0,
        min(100.0, risk_score)
    )

    # ========================================================
    # MAINTENANCE PRIORITY
    # ========================================================

    if (
        current_soh < 40
        or risk_score >= 70
    ):

        priority = "Critical"

        action = (
            "Immediate battery inspection "
            "and maintenance recommended."
        )

        condition = "Critical"

    elif (
        current_soh < 60
        or risk_score >= 45
    ):

        priority = "High"

        action = (
            "Schedule battery inspection "
            "and preventive maintenance."
        )

        condition = "Needs Attention"

    elif (
        current_soh < 80
        or risk_score >= 20
    ):

        priority = "Medium"

        action = (
            "Continue monitoring battery health "
            "and schedule routine inspection."
        )

        condition = "Good"

    else:

        priority = "Low"

        action = (
            "Battery operating normally. "
            "Continue routine monitoring."
        )

        condition = "Healthy"

    # ========================================================
    # CHARGING RECOMMENDATION
    # ========================================================

    if condition == "Critical":

        charging_recommendation = (
            "Use a nearby charging station and "
            "prioritize battery inspection."
        )

    elif condition == "Needs Attention":

        charging_recommendation = (
            "Charging is recommended before extended operation."
        )

    else:

        charging_recommendation = (
            "Normal charging operation is acceptable."
        )

    # ========================================================
    # DEFAULT REASON
    # ========================================================

    if not reasons:

        reasons.append(
            "No significant maintenance risk indicators detected."
        )

    # ========================================================
    # RETURN
    # ========================================================

    return {
        "battery_id": battery_id,

        "condition": condition,

        "maintenance_priority": priority,

        "risk_score": round(
            risk_score,
            2
        ),

        "current_soh_percent": round(
            current_soh,
            2
        ),

        "predicted_soh_percent": (
            round(
                predicted_soh,
                2
            )
            if predicted_soh is not None
            else None
        ),

        "initial_soh_percent": round(
            initial_soh,
            2
        ),

        "degradation_percent": round(
            degradation_ratio,
            2
        ),

        "cycle": int(cycle),

        "capacity_Ah": round(
            capacity,
            4
        ),

        "capacity_retention_percent": round(
            capacity_retention,
            2
        ),

        "temperature_mean": round(
            temperature,
            2
        ),

        "current_mean": round(
            current_mean,
            4
        ),

        "capacity_degradation_rate": round(
            degradation_rate,
            6
        ),

        "cycle_progress": round(
            cycle_progress,
            4
        ),

        "recent_soh_slope": round(
            recent_soh_slope,
            6
        ),

        "recommended_action": action,

        "charging_recommendation":
            charging_recommendation,

        "risk_factors": reasons,

        "total_records": len(
            battery_data
        )
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("EV BATTERY MAINTENANCE MODEL")
    print("=" * 60)

    vehicles = sorted(
        df["battery_id"]
        .unique()
        .tolist()
    )

    print("\nAvailable batteries:")

    for vehicle in vehicles:

        result = analyze_battery(
            vehicle
        )

        print("\n" + "-" * 50)

        print(
            "Battery:",
            result["battery_id"]
        )

        print(
            "Condition:",
            result["condition"]
        )

        print(
            "Priority:",
            result["maintenance_priority"]
        )

        print(
            "Risk Score:",
            result["risk_score"]
        )

        print(
            "Current SOH:",
            result["current_soh_percent"]
        )

        print(
            "Degradation:",
            result["degradation_percent"],
            "%"
        )

        print(
            "Recommended Action:",
            result["recommended_action"]
        )

    print("\n" + "=" * 60)
    print("MAINTENANCE MODEL TEST COMPLETE")
    print("=" * 60)