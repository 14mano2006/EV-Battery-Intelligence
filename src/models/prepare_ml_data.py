import pandas as pd
from pathlib import Path


# ============================================================
# PATHS
# ============================================================

INPUT_FILE = Path(
    "data/processed/battery_ml_degradation_features.csv"
)

OUTPUT_FILE = Path(
    "data/processed/ml_ready_dataset.csv"
)


# ============================================================
# LOAD DATASET
# ============================================================

df = pd.read_csv(INPUT_FILE)

print("=" * 60)
print("ML DATA PREPARATION")
print("=" * 60)

print("\nOriginal dataset shape:")
print(df.shape)


# ============================================================
# TARGET
# ============================================================

TARGET = "SOH_percent"


# ============================================================
# FEATURES
# ============================================================

FEATURES = [
    "cycle",

    "voltage_mean",
    "voltage_min",
    "voltage_max",
    "voltage_std",
    "voltage_range",

    "current_mean",
    "current_min",
    "current_max",
    "current_std",

    "temperature_mean",
    "temperature_min",
    "temperature_max",
    "temperature_std",

    "discharge_duration",

    "capacity_Ah",
    "initial_capacity_Ah",

    "capacity_change",
    "capacity_degradation_rate",

    "cycle_progress"
]


# ============================================================
# CHECK TARGET
# ============================================================

if TARGET not in df.columns:
    raise ValueError(
        f"Target column '{TARGET}' was not found in dataset."
    )


# ============================================================
# CHECK FEATURES
# ============================================================

missing_features = [
    feature
    for feature in FEATURES
    if feature not in df.columns
]

if missing_features:
    raise ValueError(
        "The following required features are missing:\n"
        + "\n".join(missing_features)
    )


print("\nTarget variable:")
print(TARGET)

print("\nSelected features:")

for feature in FEATURES:
    print("-", feature)


# ============================================================
# CREATE ML DATASET
# ============================================================

ml_df = df[
    FEATURES + [TARGET]
].copy()


# ============================================================
# CONVERT TO NUMERIC
# ============================================================

for column in FEATURES + [TARGET]:
    ml_df[column] = pd.to_numeric(
        ml_df[column],
        errors="coerce"
    )


# ============================================================
# REMOVE INVALID VALUES
# ============================================================

ml_df = ml_df.replace(
    [float("inf"), float("-inf")],
    pd.NA
)

ml_df = ml_df.dropna().reset_index(drop=True)


# ============================================================
# MISSING VALUES
# ============================================================

print("\nTotal missing values after cleaning:")
print(ml_df.isnull().sum().sum())


# ============================================================
# DATASET INFORMATION
# ============================================================

print("\nFinal ML dataset shape:")
print(ml_df.shape)

print("\nNumber of features:")
print(len(FEATURES))

print("\nFinal columns:")
print(ml_df.columns.tolist())


# ============================================================
# BATTERY INFORMATION
# ============================================================

print("\nRecords available per battery:")

if "battery_id" in df.columns:
    print(
        df.groupby("battery_id")
        .size()
    )


# ============================================================
# SOH INFORMATION
# ============================================================

print("\nSOH range:")

print(
    f"Minimum SOH: {ml_df[TARGET].min():.2f}%"
)

print(
    f"Maximum SOH: {ml_df[TARGET].max():.2f}%"
)


# ============================================================
# SAVE DATASET
# ============================================================

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

ml_df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# PREVIEW
# ============================================================

print("\nFirst 5 rows:")

print(
    ml_df.head()
)


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("ML DATA PREPARATION COMPLETE")
print("=" * 60)

print("\nML dataset saved to:")
print(OUTPUT_FILE)

print("\nFinal shape:")
print(ml_df.shape)