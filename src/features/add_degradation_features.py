import pandas as pd
from pathlib import Path


# ============================================================
# 1. LOAD FEATURE DATASET
# ============================================================

INPUT_FILE = Path("data/processed/battery_ml_features.csv")
OUTPUT_FILE = Path("data/processed/battery_ml_degradation_features.csv")

df = pd.read_csv(INPUT_FILE)

print("=" * 60)
print("DEGRADATION FEATURE ENGINEERING")
print("=" * 60)

print("\nOriginal dataset shape:")
print(df.shape)


# ============================================================
# 2. SORT DATA
# ============================================================

# Make sure each battery is ordered by cycle number
df = df.sort_values(
    ["battery_id", "cycle"]
).reset_index(drop=True)


# ============================================================
# 3. SOH CHANGE
# ============================================================

# Change in SOH compared with the previous cycle
df["SOH_change"] = (
    df.groupby("battery_id")["SOH_percent"]
    .diff()
)


# ============================================================
# 4. CAPACITY CHANGE
# ============================================================

# Change in capacity compared with the previous cycle
df["capacity_change"] = (
    df.groupby("battery_id")["capacity_Ah"]
    .diff()
)


# ============================================================
# 5. SOH DEGRADATION RATE
# ============================================================

# SOH change per cycle
df["SOH_degradation_rate"] = (
    df["SOH_change"] /
    df.groupby("battery_id")["cycle"].diff()
)


# ============================================================
# 6. CAPACITY DEGRADATION RATE
# ============================================================

# Capacity change per cycle
df["capacity_degradation_rate"] = (
    df["capacity_change"] /
    df.groupby("battery_id")["cycle"].diff()
)


# ============================================================
# 7. CUMULATIVE CYCLE NUMBER
# ============================================================

# Number of cycles completed for each battery
df["cycle_progress"] = (
    df.groupby("battery_id").cumcount()
)


# ============================================================
# 8. HANDLE FIRST RECORD OF EACH BATTERY
# ============================================================

# The first record has no previous cycle,
# therefore degradation cannot be calculated.
# We use 0 for the first record.

degradation_columns = [
    "SOH_change",
    "capacity_change",
    "SOH_degradation_rate",
    "capacity_degradation_rate"
]

df[degradation_columns] = (
    df[degradation_columns].fillna(0)
)


# ============================================================
# 9. DISPLAY RESULTS
# ============================================================

print("\nNew dataset shape:")
print(df.shape)

print("\nNew degradation features:")
print(degradation_columns + ["cycle_progress"])

print("\nFirst 10 records:")
print(
    df[
        [
            "battery_id",
            "cycle",
            "SOH_percent",
            "SOH_change",
            "capacity_Ah",
            "capacity_change",
            "SOH_degradation_rate",
            "capacity_degradation_rate",
            "cycle_progress"
        ]
    ].head(10)
)


# ============================================================
# 10. SAVE DATASET
# ============================================================

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# 11. FINAL MESSAGE
# ============================================================

print("\n" + "=" * 60)
print("DEGRADATION FEATURE ENGINEERING COMPLETE")
print("=" * 60)

print("\nDataset saved to:")
print(OUTPUT_FILE)

print("\nFinal dataset shape:")
print(df.shape)