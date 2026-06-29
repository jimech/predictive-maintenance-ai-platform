from __future__ import annotations

from typing import Optional


def calculate_health_score(estimated_rul: float, anomaly_score: Optional[float] = None) -> float:
    rul_component = max(0.0, min(1.0, estimated_rul / 130.0))
    anomaly_component = 1.0 - anomaly_score if anomaly_score is not None else rul_component
    return round((0.75 * rul_component) + (0.25 * anomaly_component), 4)


def classify_risk(estimated_rul: float, health_score: float) -> str:
    if estimated_rul <= 20 or health_score < 0.25:
        return "critical"
    if estimated_rul <= 50 or health_score < 0.45:
        return "warning"
    if estimated_rul <= 80 or health_score < 0.65:
        return "watch"
    return "healthy"


def generate_recommendation(risk_category: str, estimated_rul: float) -> str:
    if risk_category == "critical":
        return f"Schedule maintenance immediately. Estimated RUL is {estimated_rul:.1f} cycles."
    if risk_category == "warning":
        return f"Plan maintenance soon. Estimated RUL is {estimated_rul:.1f} cycles."
    if risk_category == "watch":
        return "Monitor closely. Degradation indicators are emerging."
    return "No immediate maintenance required."


def failure_probability_for_risk(risk_category: str, estimated_rul: float) -> float:
    if risk_category == "critical":
        return round(min(0.98, 0.75 + (20 - min(estimated_rul, 20)) * 0.01), 2)
    if risk_category == "warning":
        return round(0.45 + (50 - min(estimated_rul, 50)) * 0.005, 2)
    if risk_category == "watch":
        return round(0.2 + (80 - min(estimated_rul, 80)) * 0.003, 2)
    return round(max(0.02, 0.15 - estimated_rul * 0.0005), 2)


def confidence_interval(estimated_rul: float) -> tuple[float, float]:
    margin = max(3.0, estimated_rul * 0.12)
    return round(max(1.0, estimated_rul - margin), 1), round(estimated_rul + margin, 1)
