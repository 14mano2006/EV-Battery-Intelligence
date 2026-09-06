import pandas as pd
from pathlib import Path

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.ensemble import GradientBoostingRegressor

from sklearn.metrics import mean_absolute_error
from sklearn.metrics import mean_squared_error
from sklearn.metrics import r2_score

import joblib
import numpy as np


# ============================================
# PATHS
# ============================================

DATA_FOLDER = Path("data/processed")

X_TRAIN_FILE = DATA_FOLDER / "X_train_scaled.csv"
X_TEST_FILE = DATA_FOLDER / "X_test_scaled.csv"

Y_TRAIN_FILE = DATA_FOLDER / "y_train.csv"
Y_TEST_FILE = DATA_FOLDER / "y_test.csv"

MODEL_FILE = DATA_FOLDER / "best_model.pkl"
RESULT_FILE = DATA_FOLDER / "model_comparison.csv"


# ============================================
# LOAD DATA
# ============================================

X_train = pd.read_csv(X_TRAIN_FILE)
X_test = pd.read_csv(X_TEST_FILE)

y_train = pd.read_csv(Y_TRAIN_FILE).squeeze()
y_test = pd.read_csv(Y_TEST_FILE).squeeze()


print("=" * 60)
print("EV BATTERY SOH MODEL TRAINING")
print("=" * 60)

print("\nTraining data:", X_train.shape)
print("Testing data :", X_test.shape)

print("\nFeatures:")
print(X_train.columns.tolist())


# ============================================
# DEFINE MODELS
# ============================================

models = {

    "Linear Regression":
        LinearRegression(),

    "Random Forest":
        RandomForestRegressor(
            n_estimators=200,
            random_state=42,
            n_jobs=-1
        ),

    "Gradient Boosting":
        GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=3,
            random_state=42
        )
}


# ============================================
# TRAIN AND EVALUATE
# ============================================

results = []

best_model = None
best_model_name = None
best_rmse = float("inf")


for name, model in models.items():

    print("\n" + "=" * 60)
    print("Training:", name)
    print("=" * 60)

    # Train
    model.fit(
        X_train,
        y_train
    )

    # Predict
    predictions = model.predict(
        X_test
    )

    # Metrics
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
        "Model": name,
        "MAE": round(mae, 4),
        "RMSE": round(rmse, 4),
        "R2": round(r2, 4)
    })

    # Select best model using RMSE
    if rmse < best_rmse:

        best_rmse = rmse
        best_model = model
        best_model_name = name


# ============================================
# MODEL COMPARISON
# ============================================

results_df = pd.DataFrame(
    results
)

results_df = results_df.sort_values(
    "RMSE"
).reset_index(
    drop=True
)


print("\n" + "=" * 60)
print("MODEL COMPARISON")
print("=" * 60)

print(results_df.to_string(index=False))


# ============================================
# SAVE RESULTS
# ============================================

results_df.to_csv(
    RESULT_FILE,
    index=False
)


# ============================================
# SAVE BEST MODEL
# ============================================

joblib.dump(
    best_model,
    MODEL_FILE
)


# ============================================
# FINAL OUTPUT
# ============================================

print("\n" + "=" * 60)
print("BEST MODEL")
print("=" * 60)

print("Model :", best_model_name)
print("RMSE  :", round(best_rmse, 4))

print("\nModel saved to:")
print(MODEL_FILE)

print("\nComparison saved to:")
print(RESULT_FILE)

print("\nNumber of features:")
print(len(X_train.columns))

print("\nFeature names:")
print(X_train.columns.tolist())

print("\n" + "=" * 60)
print("MODEL TRAINING COMPLETE")
print("=" * 60)