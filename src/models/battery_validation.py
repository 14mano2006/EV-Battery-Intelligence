import pandas as pd
import numpy as np

from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error
from sklearn.metrics import mean_squared_error
from sklearn.metrics import r2_score


# ============================================
# 1. LOAD COMPLETE ML DATASET
# ============================================

data_file = Path("data/processed/battery_ml_degradation_features.csv")
df = pd.read_csv(data_file)

print("Dataset shape:", df.shape)

print("\nBatteries:")
print(df["battery_id"].unique())


# ============================================
# 2. DEFINE FEATURES AND TARGET
# ============================================

target = "SOH_percent"
group = "battery_id"

features = [
    column for column in df.columns
    if column not in [target, group]
]

X = df[features]
y = df[target]
battery_ids = df[group]


# ============================================
# 3. BATTERY-WISE VALIDATION
# ============================================

batteries = sorted(battery_ids.unique())

results = []


for test_battery in batteries:

    print("\n" + "=" * 60)
    print("Testing battery:", test_battery)
    print("=" * 60)

    # -------------------------------
    # Split by battery
    # -------------------------------

    train_mask = battery_ids != test_battery
    test_mask = battery_ids == test_battery

    X_train = X[train_mask]
    X_test = X[test_mask]

    y_train = y[train_mask]
    y_test = y[test_mask]

    print("Training rows:", len(X_train))
    print("Testing rows :", len(X_test))

    # -------------------------------
    # Scale using TRAINING data only
    # -------------------------------

    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # -------------------------------
    # Train Linear Regression
    # -------------------------------

    model = LinearRegression()

    model.fit(
        X_train_scaled,
        y_train
    )

    # -------------------------------
    # Predict
    # -------------------------------

    predictions = model.predict(X_test_scaled)

    # -------------------------------
    # Evaluation
    # -------------------------------

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    rmse = np.sqrt(
        mean_squared_error(
            y_test,
            predictions
        )
    )

    r2 = r2_score(
        y_test,
        predictions
    )

    print("MAE :", round(mae, 4))
    print("RMSE:", round(rmse, 4))
    print("R²  :", round(r2, 4))

    results.append({
        "Test_Battery": test_battery,
        "MAE": mae,
        "RMSE": rmse,
        "R2": r2
    })


# ============================================
# 4. RESULTS SUMMARY
# ============================================

results_df = pd.DataFrame(results)

print("\n" + "=" * 60)
print("BATTERY-WISE VALIDATION RESULTS")
print("=" * 60)

print(results_df)


# ============================================
# 5. AVERAGE PERFORMANCE
# ============================================

print("\nAverage performance:")

print(
    "MAE :",
    round(results_df["MAE"].mean(), 4)
)

print(
    "RMSE:",
    round(results_df["RMSE"].mean(), 4)
)

print(
    "R²  :",
    round(results_df["R2"].mean(), 4)
)


# ============================================
# 6. SAVE RESULTS
# ============================================

output_file = Path(
    "data/processed/battery_wise_validation.csv"
)

results_df.to_csv(
    output_file,
    index=False
)


print("\nResults saved to:")
print(output_file)

print("\n" + "=" * 60)
print("BATTERY-WISE VALIDATION COMPLETE")
print("=" * 60)