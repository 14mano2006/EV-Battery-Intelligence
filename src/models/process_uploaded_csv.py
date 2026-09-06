import pandas as pd
import numpy as np


# ============================================================
# REQUIRED RAW CSV COLUMNS
# ============================================================

REQUIRED_COLUMNS = [
    "cycle",
    "Voltage_measured",
    "Current_measured",
    "Temperature_measured",
    "Time",
    "Capacity"
]


# ============================================================
# ML FEATURE NAMES
# ============================================================

FEATURE_NAMES = [
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
# VALIDATE CSV
# ============================================================

def validate_csv(df):

    missing_columns = [
        column
        for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:

        raise ValueError(
            {
                "message": "Required columns are missing.",
                "missing_columns": missing_columns,
                "required_columns": REQUIRED_COLUMNS
            }
        )


# ============================================================
# CONVERT NUMERIC COLUMNS
# ============================================================

def prepare_dataframe(df):

    df = df.copy()

    for column in REQUIRED_COLUMNS:

        if column == "cycle":
            continue

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    df["cycle"] = pd.to_numeric(
        df["cycle"],
        errors="coerce"
    )

    df = df.dropna(
        subset=REQUIRED_COLUMNS
    )

    if df.empty:

        raise ValueError(
            "CSV does not contain valid battery measurements."
        )

    return df


# ============================================================
# CALCULATE FEATURES FOR ONE CYCLE
# ============================================================

def calculate_cycle_features(
    cycle_number,
    cycle_data,
    initial_capacity
):

    voltage = cycle_data[
        "Voltage_measured"
    ]

    current = cycle_data[
        "Current_measured"
    ]

    temperature = cycle_data[
        "Temperature_measured"
    ]

    time = cycle_data[
        "Time"
    ]

    capacity = float(
        cycle_data["Capacity"].iloc[-1]
    )

    # --------------------------------------------------------
    # Voltage
    # --------------------------------------------------------

    voltage_mean = float(
        voltage.mean()
    )

    voltage_min = float(
        voltage.min()
    )

    voltage_max = float(
        voltage.max()
    )

    voltage_std = float(
        voltage.std()
    )

    voltage_range = (
        voltage_max - voltage_min
    )

    # --------------------------------------------------------
    # Current
    # --------------------------------------------------------

    current_mean = float(
        current.mean()
    )

    current_min = float(
        current.min()
    )

    current_max = float(
        current.max()
    )

    current_std = float(
        current.std()
    )

    # --------------------------------------------------------
    # Temperature
    # --------------------------------------------------------

    temperature_mean = float(
        temperature.mean()
    )

    temperature_min = float(
        temperature.min()
    )

    temperature_max = float(
        temperature.max()
    )

    temperature_std = float(
        temperature.std()
    )

    # --------------------------------------------------------
    # Discharge duration
    # --------------------------------------------------------

    discharge_duration = float(
        time.max() - time.min()
    )

    # --------------------------------------------------------
    # Capacity
    # --------------------------------------------------------

    capacity_change = (
        capacity - initial_capacity
    )

    capacity_degradation_rate = 0.0

    if initial_capacity != 0:

        capacity_degradation_rate = (
            (initial_capacity - capacity)
            / initial_capacity
        ) * 100

    # --------------------------------------------------------
    # Cycle progress
    # --------------------------------------------------------

    maximum_cycle = float(
        cycle_data["_maximum_cycle"].iloc[0]
    )

    if maximum_cycle > 0:

        cycle_progress = (
            float(cycle_number)
            / maximum_cycle
        ) * 100

    else:

        cycle_progress = 0.0

    # --------------------------------------------------------
    # SOH
    # --------------------------------------------------------

    soh_percent = None

    if initial_capacity != 0:

        soh_percent = (
            capacity
            / initial_capacity
        ) * 100

    # --------------------------------------------------------
    # Return features
    # --------------------------------------------------------

    return {

        "cycle": float(cycle_number),

        "voltage_mean":
            voltage_mean,

        "voltage_min":
            voltage_min,

        "voltage_max":
            voltage_max,

        "voltage_std":
            voltage_std,

        "voltage_range":
            voltage_range,

        "current_mean":
            current_mean,

        "current_min":
            current_min,

        "current_max":
            current_max,

        "current_std":
            current_std,

        "temperature_mean":
            temperature_mean,

        "temperature_min":
            temperature_min,

        "temperature_max":
            temperature_max,

        "temperature_std":
            temperature_std,

        "discharge_duration":
            discharge_duration,

        "capacity_Ah":
            capacity,

        "initial_capacity_Ah":
            initial_capacity,

        "capacity_change":
            capacity_change,

        "capacity_degradation_rate":
            capacity_degradation_rate,

        "cycle_progress":
            cycle_progress,

        "SOH_percent":
            soh_percent
    }


# ============================================================
# PROCESS UPLOADED CSV
# ============================================================

def process_uploaded_csv(
    csv_path,
    battery_id
):

    # --------------------------------------------------------
    # Read CSV
    # --------------------------------------------------------

    try:

        df = pd.read_csv(
            csv_path
        )

    except Exception as e:

        raise ValueError(
            f"Unable to read CSV file: {e}"
        )

    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    validate_csv(df)

    # --------------------------------------------------------
    # Prepare
    # --------------------------------------------------------

    df = prepare_dataframe(
        df
    )

    # --------------------------------------------------------
    # Normalize battery ID
    # --------------------------------------------------------

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    if not battery_id:

        raise ValueError(
            "Battery ID cannot be empty."
        )

    # --------------------------------------------------------
    # Maximum cycle
    # --------------------------------------------------------

    maximum_cycle = int(
        df["cycle"].max()
    )

    df["_maximum_cycle"] = (
        maximum_cycle
    )

    # --------------------------------------------------------
    # Initial capacity
    # --------------------------------------------------------

    first_cycle = (
        df["cycle"].min()
    )

    first_cycle_data = df[
        df["cycle"] == first_cycle
    ]

    initial_capacity = float(
        first_cycle_data[
            "Capacity"
        ].iloc[-1]
    )

    if initial_capacity <= 0:

        raise ValueError(
            "Initial battery capacity must be greater than zero."
        )

    # --------------------------------------------------------
    # Process every cycle
    # --------------------------------------------------------

    records = []

    cycles = sorted(
        df["cycle"]
        .unique()
    )

    for cycle_number in cycles:

        cycle_data = df[
            df["cycle"] == cycle_number
        ].copy()

        if cycle_data.empty:
            continue

        features = calculate_cycle_features(
            cycle_number,
            cycle_data,
            initial_capacity
        )

        features[
            "battery_id"
        ] = battery_id

        records.append(
            features
        )

    # --------------------------------------------------------
    # Check result
    # --------------------------------------------------------

    if not records:

        raise ValueError(
            "No valid battery cycles were found in the CSV."
        )

    result = pd.DataFrame(
        records
    )

    # --------------------------------------------------------
    # Reorder columns
    # --------------------------------------------------------

    columns = [
        "battery_id"
    ]

    columns.extend(
        FEATURE_NAMES
    )

    columns.append(
        "SOH_percent"
    )

    result = result[
        columns
    ]

    # --------------------------------------------------------
    # Sort
    # --------------------------------------------------------

    result = (
        result
        .sort_values("cycle")
        .reset_index(drop=True)
    )

    # --------------------------------------------------------
    # Clean numerical values
    # --------------------------------------------------------

    result = result.replace(
        [
            np.inf,
            -np.inf
        ],
        np.nan
    )

    result = result.dropna(
        subset=FEATURE_NAMES
    )

    # --------------------------------------------------------
    # Final validation
    # --------------------------------------------------------

    if result.empty:

        raise ValueError(
            "Feature extraction produced no valid records."
        )

    return result


# ============================================================
# SAVE PROCESSED DATASET
# ============================================================

def save_processed_csv(
    result,
    output_path
):

    result.to_csv(
        output_path,
        index=False
    )


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    print("=" * 60)
    print("UPLOADED BATTERY CSV PROCESSOR")
    print("=" * 60)

    print("\nRequired raw columns:")

    for column in REQUIRED_COLUMNS:

        print(
            " -",
            column
        )

    print("\nGenerated ML features:")

    for feature in FEATURE_NAMES:

        print(
            " -",
            feature
        )

    print("\nProcessor ready.")
    print("=" * 60)