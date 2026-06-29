"""Regression metrics for RUL models."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error


def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    """Return MAE and RMSE for RUL predictions."""
    y_true_array = np.asarray(y_true, dtype=float)
    y_pred_array = np.asarray(y_pred, dtype=float)

    mae = float(mean_absolute_error(y_true_array, y_pred_array))
    rmse = float(np.sqrt(mean_squared_error(y_true_array, y_pred_array)))
    return {"mae": mae, "rmse": rmse}
