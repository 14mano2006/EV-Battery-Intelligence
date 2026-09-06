import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score
)


# ============================================================
# 1. LOAD PREDICTION RESULTS
# ============================================================

data_folder = Path("data/processed")

input_file = data_folder / "soh_predictions.csv"

df = pd.read_csv(input_file)


print("=" * 60)
print("MODEL EVALUATION")
print("=" * 60)

print("\nPrediction dataset shape:")
print(df.shape)

print("\nFirst 5 predictions:")
print(df.head())


# ============================================================
# 2. GET ACTUAL AND PREDICTED VALUES
# ============================================================

actual = df["Actual_SOH"]

predicted = df["Predicted_SOH"]

error = df["Error"]


# ============================================================
# 3. CALCULATE METRICS
# ============================================================

mae = mean_absolute_error(actual, predicted)

rmse = np.sqrt(mean_squared_error(actual, predicted))

r2 = r2_score(actual, predicted)

mean_error = error.mean()

max_error = error.abs().max()


# ============================================================
# 4. DISPLAY METRICS
# ============================================================

print("\n" + "=" * 60)
print("EVALUATION METRICS")
print("=" * 60)

print(f"MAE         : {mae:.4f}")
print(f"RMSE        : {rmse:.4f}")
print(f"R²          : {r2:.4f}")
print(f"Mean Error  : {mean_error:.4f}")
print(f"Maximum Error: {max_error:.4f}")


# ============================================================
# 5. ACTUAL VS PREDICTED SCATTER PLOT
# ============================================================

plt.figure(figsize=(8, 6))

plt.scatter(actual, predicted)

plt.xlabel("Actual SOH (%)")
plt.ylabel("Predicted SOH (%)")
plt.title("Actual vs Predicted Battery SOH")

# Perfect prediction reference line
minimum = min(actual.min(), predicted.min())
maximum = max(actual.max(), predicted.max())

plt.plot(
    [minimum, maximum],
    [minimum, maximum],
    linestyle="--"
)

plt.grid(True)

plt.tight_layout()

plt.show()


# ============================================================
# 6. ERROR DISTRIBUTION
# ============================================================

plt.figure(figsize=(8, 6))

plt.hist(error, bins=20)

plt.xlabel("Prediction Error (%)")
plt.ylabel("Frequency")
plt.title("SOH Prediction Error Distribution")

plt.grid(True)

plt.tight_layout()

plt.show()


# ============================================================
# 7. SAVE EVALUATION SUMMARY
# ============================================================

evaluation = pd.DataFrame({
    "Metric": [
        "MAE",
        "RMSE",
        "R2",
        "Mean Error",
        "Maximum Absolute Error"
    ],
    "Value": [
        mae,
        rmse,
        r2,
        mean_error,
        max_error
    ]
})

output_file = data_folder / "model_evaluation.csv"

evaluation.to_csv(
    output_file,
    index=False
)


print("\nEvaluation summary saved to:")
print(output_file)


# ============================================================
# 8. FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)
print("MODEL EVALUATION COMPLETE")
print("=" * 60)