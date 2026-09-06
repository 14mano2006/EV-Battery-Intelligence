# ============================================================
# EV BATTERY INTELLIGENCE
# MAINTENANCE INTELLIGENCE MODEL
# ============================================================

def calculate_maintenance_risk(
    current_soh,
    degradation,
    predicted_soh=None,
    prediction_error=None,
    temperature_max=None,
    temperature_mean=None,
    cycle=None,
):
    """
    Transparent rule-based maintenance risk engine.

    ML model:
        Predicts battery SOH.

    Maintenance engine:
        Converts battery health indicators into
        maintenance risk and recommendations.
    """

    # --------------------------------------------------------
    # Convert values safely
    # --------------------------------------------------------

    current_soh = (
        float(current_soh)
        if current_soh is not None
        else None
    )

    degradation = (
        float(degradation)
        if degradation is not None
        else 0.0
    )

    predicted_soh = (
        float(predicted_soh)
        if predicted_soh is not None
        else None
    )

    prediction_error = (
        float(prediction_error)
        if prediction_error is not None
        else 0.0
    )

    temperature_max = (
        float(temperature_max)
        if temperature_max is not None
        else None
    )

    temperature_mean = (
        float(temperature_mean)
        if temperature_mean is not None
        else None
    )

    cycle = (
        int(cycle)
        if cycle is not None
        else None
    )

    # --------------------------------------------------------
    # Missing SOH
    # --------------------------------------------------------

    if current_soh is None:
        return {
            "risk_level": "UNKNOWN",
            "risk_score": 0,
            "maintenance_required": False,
            "recommendation": "Insufficient battery health data.",
            "reason": "Current SOH is unavailable.",
            "risk_factors": []
        }

    # --------------------------------------------------------
    # Risk calculation
    # --------------------------------------------------------

    score = 0

    risk_factors = []

    # ========================================================
    # SOH
    # ========================================================

    if current_soh < 60:

        score += 50

        risk_factors.append(
            "Very low State of Health"
        )

    elif current_soh < 70:

        score += 35

        risk_factors.append(
            "Low State of Health"
        )

    elif current_soh < 80:

        score += 20

        risk_factors.append(
            "Moderately degraded State of Health"
        )

    elif current_soh < 90:

        score += 10

    # ========================================================
    # DEGRADATION
    # ========================================================

    if degradation >= 40:

        score += 30

        risk_factors.append(
            "Severe capacity degradation"
        )

    elif degradation >= 30:

        score += 25

        risk_factors.append(
            "High battery degradation"
        )

    elif degradation >= 20:

        score += 15

        risk_factors.append(
            "Significant battery degradation"
        )

    elif degradation >= 10:

        score += 5

        risk_factors.append(
            "Early battery degradation"
        )

    # ========================================================
    # MAX TEMPERATURE
    # ========================================================

    if temperature_max is not None:

        if temperature_max >= 45:

            score += 25

            risk_factors.append(
                "High peak battery temperature"
            )

        elif temperature_max >= 40:

            score += 15

            risk_factors.append(
                "Elevated peak battery temperature"
            )

        elif temperature_max >= 35:

            score += 5

    # ========================================================
    # MEAN TEMPERATURE
    # ========================================================

    if temperature_mean is not None:

        if temperature_mean >= 35:

            score += 15

            risk_factors.append(
                "High average battery temperature"
            )

        elif temperature_mean >= 30:

            score += 5

    # ========================================================
    # PREDICTED SOH
    # ========================================================

    if predicted_soh is not None:

        if predicted_soh < 60:

            score += 20

            risk_factors.append(
                "Predicted SOH is critically low"
            )

        elif predicted_soh < 70:

            score += 10

            risk_factors.append(
                "Predicted SOH indicates future attention"
            )

    # ========================================================
    # PREDICTION ERROR
    # ========================================================

    if abs(prediction_error) >= 5:

        score += 10

        risk_factors.append(
            "Large difference between actual and predicted SOH"
        )

    # ========================================================
    # CYCLE COUNT
    # ========================================================

    if cycle is not None:

        if cycle >= 600:

            score += 10

            risk_factors.append(
                "Very high cycle count"
            )

        elif cycle >= 500:

            score += 5

            risk_factors.append(
                "High cycle count"
            )

    # --------------------------------------------------------
    # Limit score
    # --------------------------------------------------------

    score = min(score, 100)

    # ========================================================
    # RISK LEVEL
    # ========================================================

    if score >= 75:

        risk_level = "CRITICAL"

    elif score >= 50:

        risk_level = "HIGH"

    elif score >= 25:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"

    # ========================================================
    # MAINTENANCE RECOMMENDATION
    # ========================================================

    if risk_level == "CRITICAL":

        maintenance_required = True

        recommendation = (
            "Immediate battery inspection recommended."
        )

    elif risk_level == "HIGH":

        maintenance_required = True

        recommendation = (
            "Schedule preventive battery maintenance."
        )

    elif risk_level == "MEDIUM":

        maintenance_required = True

        recommendation = (
            "Monitor battery closely and schedule inspection."
        )

    else:

        maintenance_required = False

        recommendation = (
            "Continue normal operation and routine monitoring."
        )

    # ========================================================
    # REASON
    # ========================================================

    if risk_factors:

        reason = "; ".join(
            risk_factors[:3]
        )

    else:

        reason = (
            "Battery health indicators are currently "
            "within acceptable operating conditions."
        )

    # ========================================================
    # RESULT
    # ========================================================

    return {
        "risk_level": risk_level,

        "risk_score": int(score),

        "maintenance_required":
            maintenance_required,

        "recommendation":
            recommendation,

        "reason":
            reason,

        "risk_factors":
            risk_factors,

        "current_soh_percent":
            round(current_soh, 2),

        "degradation_percent":
            round(degradation, 2),

        "predicted_soh_percent":
            (
                round(predicted_soh, 2)
                if predicted_soh is not None
                else None
            )
    }


# ============================================================
# FLEET PRIORITY SCORE
# ============================================================

def calculate_priority_score(
    risk_score,
    current_soh,
    degradation,
):
    """
    Higher priority score means the vehicle
    should receive maintenance sooner.
    """

    risk_score = float(
        risk_score or 0
    )

    soh_penalty = 0

    if current_soh is not None:

        if current_soh < 60:

            soh_penalty = 30

        elif current_soh < 70:

            soh_penalty = 20

        elif current_soh < 80:

            soh_penalty = 10

    degradation_penalty = 0

    if degradation is not None:

        if degradation >= 40:

            degradation_penalty = 20

        elif degradation >= 30:

            degradation_penalty = 15

        elif degradation >= 20:

            degradation_penalty = 10

        elif degradation >= 10:

            degradation_penalty = 5

    priority = (
        risk_score
        + soh_penalty
        + degradation_penalty
    )

    return round(
        min(priority, 100),
        2
    )