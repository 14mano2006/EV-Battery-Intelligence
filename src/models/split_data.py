import pandas as pd
from pathlib import Path


# ============================================================
# SETTINGS
# ============================================================

INPUT_FILE = Path(
    "data/processed/battery_ml_degradation_features.csv"
)

OUTPUT_FOLDER = Path(
    "data/processed"
)

TEST_BATTERY = "B0018"


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

TARGET = "SOH_percent"


# ============================================================
# LOAD DATASET
# ============================================================

df = pd.read_csv(INPUT_FILE)

print("=" * 60)
print("BATTERY-AWARE TRAIN / TEST SPLIT")
print("=" * 60)

print("\nDataset shape:")
print(df.shape)


# ============================================================
# CHECK REQUIRED COLUMNS
# ============================================================

required_columns = [
    "battery_id",
    TARGET
] + FEATURES

missing_columns = [
    column
    for column in required_columns
    if column not in df.columns
]

if missing_columns:
    raise ValueError(
        "Missing required columns:\n"
        + "\n".join(missing_columns)
    )


# ============================================================
# BATTERY INFORMATION
# ============================================================

print("\nAvailable batteries:")

print(
    sorted(
        df["battery_id"]
        .astype(str)
        .unique()
        .tolist()
    )
)

print("\nRecords per battery:")

print(
    df.groupby("battery_id")
    .size()
)


# ============================================================
# CHECK TEST BATTERY
# ============================================================

if TEST_BATTERY not in df["battery_id"].astype(str).unique():
    raise ValueError(
        f"Test battery '{TEST_BATTERY}' was not found."
    )


# ============================================================
# SPLIT BY BATTERY
# ============================================================

train_df = df[
    df["battery_id"].astype(str) != TEST_BATTERY
].copy()

test_df = df[
    df["battery_id"].astype(str) == TEST_BATTERY
].copy()


# ============================================================
# SORT BY BATTERY AND CYCLE
# ============================================================

train_df = train_df.sort_values(
    ["battery_id", "cycle"]
).reset_index(drop=True)

test_df = test_df.sort_values(
    ["battery_id", "cycle"]
).reset_index(drop=True)


# ============================================================
# CREATE FEATURES AND TARGET
# ============================================================

X_train = train_df[FEATURES].copy()
y_train = train_df[TARGET].copy()

X_test = test_df[FEATURES].copy()
y_test = test_df[TARGET].copy()


# ============================================================
# DISPLAY SPLIT INFORMATION
# ============================================================

print("\n" + "=" * 60)
print("SPLIT INFORMATION")
print("=" * 60)

print("\nTraining batteries:")
print(
    sorted(
        train_df["battery_id"]
        .astype(str)
        .unique()
        .tolist()
    )
)

print("\nTesting battery:")
print(TEST_BATTERY)

print("\nTraining records:")
print(len(X_train))

print("Testing records:")
print(len(X_test))

print("\nX_train shape:")
print(X_train.shape)

print("X_test shape:")
print(X_test.shape)

print("\ny_train shape:")
print(y_train.shape)

print("y_test shape:")
print(y_test.shape)


# ============================================================
# DISPLAY CYCLE RANGES
# ============================================================

print("\nTraining battery cycle ranges:")

print(
    train_df
    .groupby("battery_id")["cycle"]
    .agg(["min", "max", "count"])
)

print("\nTesting battery cycle range:")

print(
    test_df
    .groupby("battery_id")["cycle"]
    .agg(["min", "max", "count"])
)


# ============================================================
# SAVE DATA
# ============================================================

OUTPUT_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)

X_train.to_csv(
    OUTPUT_FOLDER / "X_train.csv",
    index=False
)

X_test.to_csv(
    OUTPUT_FOLDER / "X_test.csv",
    index=False
)

y_train.to_csv(
    OUTPUT_FOLDER / "y_train.csv",
    index=False
)

y_test.to_csv(
    OUTPUT_FOLDER / "y_test.csv",
    index=False
)


# ============================================================
# SAVE BATTERY INFORMATION
# ============================================================

train_df[
    ["battery_id", "cycle"]
].to_csv(
    OUTPUT_FOLDER / "train_battery_info.csv",
    index=False
)

test_df[
    ["battery_id", "cycle"]
].to_csv(
    OUTPUT_FOLDER / "test_battery_info.csv",
    index=False
)


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("BATTERY-AWARE SPLIT COMPLETE")
print("=" * 60)

print("\nTraining data saved to:")
print(OUTPUT_FOLDER / "X_train.csv")

print("\nTesting data saved to:")
print(OUTPUT_FOLDER / "X_test.csv")

print("\nTarget files saved successfully.")

print("\nIMPORTANT:")
print(
    f"{TEST_BATTERY} was completely excluded "
    "from the training data."
)