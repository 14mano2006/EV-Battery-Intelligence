import pandas as pd
import joblib
from pathlib import Path

from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)

import numpy as np
import matplotlib.pyplot as plt


# ============================================================
# PATHS
# ============================================================

DATA_FOLDER = Path("data/processed")

X_TEST_FILE = DATA_FOLDER / "X_test.csv"
Y_TEST_FILE = DATA_FOLDER / "y_test.csv"

SCALER_FILE = DATA_FOLDER / "scaler.pkl"
MODEL_FILE = DATA_FOLDER / "best_model.pkl"

OUTPUT_FILE = DATA_FOLDER / "soh_predictions.csv"


# ============================================================
# LOAD TEST DATA
# ============================================================

X_test = pd.read_csv(X_TEST_FILE)
y_test = pd.read_csv(Y_TEST_FILE).squeeze()


print("=" * 60)
print("SOH PREDICTION")
print("=" * 60)

print("\nTest data shape:")
print(X_test.shape)

print("\nActual SOH shape:")
print(y_test.shape)


# ============================================================
# LOAD SCALER
# ============================================================

scaler = joblib.load(SCALER_FILE)

print("\nScaler loaded successfully.")


# ============================================================
# SCALE TEST DATA
# ============================================================

X_test_scaled = scaler.transform(X_test)

X_test_scaled = pd.DataFrame(
    X_test_scaled,
    columns=X_test.columns
)


# ============================================================
# LOAD MODEL
# ============================================================

model = joblib.load(MODEL_FILE)

print("\nModel loaded successfully:")
print(type(model).__name__)


# ============================================================
# MAKE PREDICTIONS
# ============================================================

y_pred = model.predict(X_test_scaled)

y_actual = y_test.values


print("\nFirst 10 predictions:")
print(y_pred[:10])

print("\nFirst 10 actual values:")
print(y_actual[:10])


# ============================================================
# CALCULATE PERFORMANCE
# ============================================================

mae = mean_absolute_error(
    y_actual,
    y_pred
)

rmse = np.sqrt(
    mean_squared_error(
        y_actual,
        y_pred
    )
)

r2 = r2_score(
    y_actual,
    y_pred
)


print("\n" + "=" * 60)
print("PREDICTION PERFORMANCE")
print("=" * 60)

print(f"MAE  : {mae:.4f}")
print(f"RMSE : {rmse:.4f}")
print(f"R²   : {r2:.4f}")


# ============================================================
# SAVE PREDICTIONS
# ============================================================

results = pd.DataFrame({

    "Actual_SOH":
        y_actual,

    "Predicted_SOH":
        y_pred,

    "Error":
        y_actual - y_pred

})


results.to_csv(
    OUTPUT_FILE,
    index=False
)


print("\nPrediction results saved to:")
print(OUTPUT_FILE)


# ============================================================
# PLOT ACTUAL VS PREDICTED
# ============================================================

plt.figure(figsize=(10, 6))

plt.plot(
    y_actual,
    label="Actual SOH"
)

plt.plot(
    y_pred,
    label="Predicted SOH"
)

plt.xlabel("Test Sample")
plt.ylabel("State of Health (%)")

plt.title(
    "Actual vs Predicted Battery SOH"
)

plt.legend()
plt.grid(True)

plt.tight_layout()

plt.show()


# ============================================================
# FINAL
# ============================================================

print("\n" + "=" * 60)
print("SOH PREDICTION COMPLETE")
print("=" * 60)