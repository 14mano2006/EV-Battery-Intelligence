import pandas as pd
import numpy as np
from pathlib import Path


# ============================================================
# 1. LOAD DATASET
# ============================================================

INPUT_FILE = Path(
    "data/processed/battery_ml_degradation_features.csv"
)

df = pd.read_csv(INPUT_FILE)

print("=" * 60)
print("ML DATASET VALIDATION")
print("=" * 60)

print("\nDataset shape:")
print(df.shape)


# ============================================================
# 2. CHECK COLUMNS
# ============================================================

print("\nColumns:")
for column in df.columns:
    print("-", column)


# ============================================================
# 3. CHECK MISSING VALUES
# ============================================================

print("\n" + "=" * 60)
print("MISSING VALUE CHECK")
print("=" * 60)

missing = df.isnull().sum()

print(missing)

print("\nTotal missing values:")
print(missing.sum())


# ============================================================
# 4. CHECK DUPLICATE ROWS
# ============================================================

print("\n" + "=" * 60)
print("DUPLICATE ROW CHECK")
print("=" * 60)

duplicates = df.duplicated().sum()

print("Duplicate rows:", duplicates)


# ============================================================
# 5. CHECK INFINITE VALUES
# ============================================================

print("\n" + "=" * 60)
print("INFINITE VALUE CHECK")
print("=" * 60)

numeric_df = df.select_dtypes(include=np.number)

infinite_values = np.isinf(numeric_df).sum()

print(infinite_values)

print("\nTotal infinite values:")
print(infinite_values.sum())


# ============================================================
# 6. CHECK BATTERY RECORDS
# ============================================================

print("\n" + "=" * 60)
print("BATTERY RECORD CHECK")
print("=" * 60)

print("\nRecords per battery:")

print(
    df.groupby("battery_id").size()
)


# ============================================================
# 7. SOH RANGE CHECK
# ============================================================

print("\n" + "=" * 60)
print("SOH RANGE CHECK")
print("=" * 60)

print("Minimum SOH:", df["SOH_percent"].min())
print("Maximum SOH:", df["SOH_percent"].max())

invalid_soh = (
    (df["SOH_percent"] < 0) |
    (df["SOH_percent"] > 100)
).sum()

print("Invalid SOH values:", invalid_soh)


# ============================================================
# 8. CAPACITY CHECK
# ============================================================

print("\n" + "=" * 60)
print("CAPACITY CHECK")
print("=" * 60)

print("Minimum capacity:",
      df["capacity_Ah"].min())

print("Maximum capacity:",
      df["capacity_Ah"].max())

print(
    "Non-positive capacity values:",
    (df["capacity_Ah"] <= 0).sum()
)


# ============================================================
# 9. CYCLE CHECK
# ============================================================

print("\n" + "=" * 60)
print("CYCLE CHECK")
print("=" * 60)

print("Minimum cycle:", df["cycle"].min())
print("Maximum cycle:", df["cycle"].max())

print(
    "Non-positive cycle values:",
    (df["cycle"] <= 0).sum()
)


# ============================================================
# 10. DEGRADATION FEATURE STATISTICS
# ============================================================

print("\n" + "=" * 60)
print("DEGRADATION FEATURE STATISTICS")
print("=" * 60)

degradation_features = [
    "SOH_change",
    "capacity_change",
    "SOH_degradation_rate",
    "capacity_degradation_rate",
    "cycle_progress"
]

print(
    df[degradation_features].describe()
)


# ============================================================
# 11. CORRELATION WITH SOH
# ============================================================

print("\n" + "=" * 60)
print("CORRELATION WITH SOH")
print("=" * 60)

correlations = (
    numeric_df.corr()["SOH_percent"]
    .sort_values(ascending=False)
)

print(correlations)


# ============================================================
# 12. FINAL VALIDATION
# ============================================================

print("\n" + "=" * 60)
print("FINAL VALIDATION SUMMARY")
print("=" * 60)

if missing.sum() == 0:
    print("✓ Missing value check PASSED")
else:
    print("✗ Missing value check FAILED")

if duplicates == 0:
    print("✓ Duplicate check PASSED")
else:
    print("✗ Duplicate check FAILED")

if infinite_values.sum() == 0:
    print("✓ Infinite value check PASSED")
else:
    print("✗ Infinite value check FAILED")

if invalid_soh == 0:
    print("✓ SOH range check PASSED")
else:
    print("✗ SOH range check FAILED")

if (df["capacity_Ah"] <= 0).sum() == 0:
    print("✓ Capacity check PASSED")
else:
    print("✗ Capacity check FAILED")

print("\n" + "=" * 60)
print("ML DATASET VALIDATION COMPLETE")
print("=" * 60)