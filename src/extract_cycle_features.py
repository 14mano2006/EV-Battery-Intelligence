import scipy.io
import numpy as np
import pandas as pd
from pathlib import Path


# ============================================================
# SETTINGS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_FOLDER = BASE_DIR / "data" / "raw"

BATTERIES = [
    "B0005",
    "B0006",
    "B0007",
    "B0018"
]

OUTPUT_FOLDER = BASE_DIR / "data" / "processed"

OUTPUT_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)

OUTPUT_FILE = (
    OUTPUT_FOLDER /
    "battery_ml_degradation_features.csv"
)


# ============================================================
# PROCESS ONE BATTERY
# ============================================================

def process_battery(battery_id):

    print("\n" + "=" * 60)
    print(f"Processing battery: {battery_id}")
    print("=" * 60)

    file_path = RAW_FOLDER / f"{battery_id}.mat"

    if not file_path.exists():

        print(
            f"ERROR: File not found: {file_path}"
        )

        return []

    # --------------------------------------------------------
    # Load MATLAB file
    # --------------------------------------------------------

    battery_data = scipy.io.loadmat(
        file_path
    )

    if battery_id not in battery_data:

        print(
            f"ERROR: {battery_id} not found in MATLAB file."
        )

        return []

    battery = battery_data[battery_id]

    cycles = battery["cycle"][0, 0]

    battery_rows = []

    # --------------------------------------------------------
    # Find initial discharge capacity
    # --------------------------------------------------------

    initial_capacity = None

    for i in range(cycles.shape[1]):

        cycle = cycles[0, i]

        cycle_type = cycle["type"][0]

        if hasattr(cycle_type, "item"):
            cycle_type = cycle_type.item()

        if cycle_type == "discharge":

            data = cycle["data"]

            capacity = float(
                np.asarray(
                    data["Capacity"][0, 0]
                ).flatten()[0]
            )

            initial_capacity = capacity

            break

    if initial_capacity is None:

        print(
            "ERROR: No discharge cycle found."
        )

        return []

    print(
        f"Initial capacity: "
        f"{initial_capacity:.4f} Ah"
    )

    # --------------------------------------------------------
    # Process discharge cycles
    # --------------------------------------------------------

    for i in range(cycles.shape[1]):

        cycle = cycles[0, i]

        cycle_type = cycle["type"][0]

        if hasattr(cycle_type, "item"):
            cycle_type = cycle_type.item()

        # Only discharge cycles
        if cycle_type != "discharge":
            continue

        data = cycle["data"]

        # ----------------------------------------------------
        # Raw measurements
        # ----------------------------------------------------

        voltage = np.asarray(
            data["Voltage_measured"][0, 0]
        ).flatten()

        current = np.asarray(
            data["Current_measured"][0, 0]
        ).flatten()

        temperature = np.asarray(
            data["Temperature_measured"][0, 0]
        ).flatten()

        time = np.asarray(
            data["Time"][0, 0]
        ).flatten()

        capacity = float(
            np.asarray(
                data["Capacity"][0, 0]
            ).flatten()[0]
        )

        # ----------------------------------------------------
        # Cycle number
        # ----------------------------------------------------

        cycle_number = i + 1

        # ----------------------------------------------------
        # SOH
        # ----------------------------------------------------

        soh = (
            capacity /
            initial_capacity
        ) * 100

        # ----------------------------------------------------
        # Capacity change
        #
        # Negative value means capacity has decreased.
        # ----------------------------------------------------

        capacity_change = (
            capacity -
            initial_capacity
        )

        # ----------------------------------------------------
        # Capacity degradation rate
        #
        # Fraction of original capacity lost.
        #
        # Example:
        # 2.00 Ah -> 1.80 Ah
        #
        # degradation = 0.10
        # ----------------------------------------------------

        capacity_degradation_rate = (
            (initial_capacity - capacity)
            / initial_capacity
        )

        # ----------------------------------------------------
        # Create row
        # ----------------------------------------------------

        row = {

            # Battery information
            "battery_id": battery_id,

            "cycle": cycle_number,

            # Voltage features
            "voltage_mean": np.mean(voltage),

            "voltage_min": np.min(voltage),

            "voltage_max": np.max(voltage),

            "voltage_std": np.std(voltage),

            "voltage_range":
                np.max(voltage) -
                np.min(voltage),

            # Current features
            "current_mean": np.mean(current),

            "current_min": np.min(current),

            "current_max": np.max(current),

            "current_std": np.std(current),

            # Temperature features
            "temperature_mean":
                np.mean(temperature),

            "temperature_min":
                np.min(temperature),

            "temperature_max":
                np.max(temperature),

            "temperature_std":
                np.std(temperature),

            # Discharge duration
            "discharge_duration":
                np.max(time) -
                np.min(time),

            # Capacity
            "capacity_Ah": capacity,

            "initial_capacity_Ah":
                initial_capacity,

            # Degradation features
            "capacity_change":
                capacity_change,

            "capacity_degradation_rate":
                capacity_degradation_rate,

            # Target
            "SOH_percent": soh
        }

        battery_rows.append(row)

    # --------------------------------------------------------
    # Calculate cycle progress
    # --------------------------------------------------------

    if battery_rows:

        maximum_cycle = max(
            row["cycle"]
            for row in battery_rows
        )

        for row in battery_rows:

            row["cycle_progress"] = (
                row["cycle"] /
                maximum_cycle
            )

    print(
        f"Discharge cycles processed: "
        f"{len(battery_rows)}"
    )

    if battery_rows:

        print(
            f"First cycle: "
            f"{battery_rows[0]['cycle']}"
        )

        print(
            f"Last cycle: "
            f"{battery_rows[-1]['cycle']}"
        )

    return battery_rows


# ============================================================
# PROCESS ALL BATTERIES
# ============================================================

all_rows = []

for battery_id in BATTERIES:

    rows = process_battery(
        battery_id
    )

    all_rows.extend(rows)


# ============================================================
# CREATE DATAFRAME
# ============================================================

df = pd.DataFrame(
    all_rows
)


# ============================================================
# CLEAN DATA
# ============================================================

df = df.replace(
    [np.inf, -np.inf],
    np.nan
)

df = df.dropna()


# ============================================================
# SORT DATA
# ============================================================

df = df.sort_values(
    [
        "battery_id",
        "cycle"
    ]
).reset_index(
    drop=True
)


# ============================================================
# COLUMN ORDER
# ============================================================

columns = [

    "battery_id",
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
    "cycle_progress",

    "SOH_percent"
]

df = df[columns]


# ============================================================
# SAVE DATASET
# ============================================================

df.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# RESULTS
# ============================================================

print("\n" + "=" * 60)
print("FEATURE EXTRACTION COMPLETE")
print("=" * 60)

print("\nDataset shape:")
print(df.shape)

print("\nColumns:")
print(df.columns.tolist())

print("\nRecords per battery:")

print(
    df.groupby("battery_id").size()
)

print("\nCycle range per battery:")

print(
    df.groupby("battery_id")["cycle"]
    .agg(["min", "max"])
)

print("\nSample degradation features:")

print(
    df[
        [
            "battery_id",
            "cycle",
            "capacity_Ah",
            "capacity_change",
            "capacity_degradation_rate",
            "cycle_progress",
            "SOH_percent"
        ]
    ].head(10)
)

print("\nFeature dataset saved to:")

print(OUTPUT_FILE)