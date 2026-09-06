import pandas as pd
from pathlib import Path

# Path to processed dataset
file_path = Path("data/processed/battery_soh_dataset.csv")

# Load dataset
df = pd.read_csv(file_path)

print("=" * 60)
print("BATTERY SOH DATASET VALIDATION")
print("=" * 60)

# --------------------------------------------------
# 1. Basic information
# --------------------------------------------------

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

# --------------------------------------------------
# 2. Battery-wise record count
# --------------------------------------------------

print("\nRecords per battery:")
print(df.groupby("battery_id").size())

# --------------------------------------------------
# 3. Missing values
# --------------------------------------------------

print("\nMissing values:")
print(df.isnull().sum())

# --------------------------------------------------
# 4. SOH range
# --------------------------------------------------

print("\nSOH range:")
print(f"Minimum SOH: {df['SOH_percent'].min():.2f}%")
print(f"Maximum SOH: {df['SOH_percent'].max():.2f}%")

# --------------------------------------------------
# 5. First record of every battery
# --------------------------------------------------

print("\nFirst record for each battery:")

first_records = (
    df.sort_values("cycle")
      .groupby("battery_id")
      .first()
)

print(
    first_records[
        ["cycle", "capacity_Ah", "initial_capacity_Ah", "SOH_percent"]
    ]
)

# --------------------------------------------------
# 6. Last record of every battery
# --------------------------------------------------

print("\nLast record for each battery:")

last_records = (
    df.sort_values("cycle")
      .groupby("battery_id")
      .last()
)

print(
    last_records[
        ["cycle", "capacity_Ah", "initial_capacity_Ah", "SOH_percent"]
    ]
)

# --------------------------------------------------
# 7. Duplicate rows
# --------------------------------------------------

print("\nDuplicate rows:")
print(df.duplicated().sum())

# --------------------------------------------------
# 8. Final validation
# --------------------------------------------------

print("\n" + "=" * 60)
print("VALIDATION COMPLETE")
print("=" * 60)