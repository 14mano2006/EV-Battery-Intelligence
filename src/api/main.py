# ============================================================
# EV BATTERY INTELLIGENCE API
# ============================================================

from pathlib import Path
from io import BytesIO
import json
import math
import urllib.parse
import urllib.request
from datetime import datetime, timezone

import joblib
import pandas as pd
import numpy as np
import scipy.io

from fastapi import (
    FastAPI,
    HTTPException,
    UploadFile,
    File,
    Form
)

from fastapi.middleware.cors import CORSMiddleware

from .vehicle_database import (
    initialize_database,
    import_existing_dataset,
    load_database,
    add_vehicle_record,
    vehicle_exists,
    get_vehicle_records
)

from .maintenance_model import (
    calculate_maintenance_risk,
    calculate_priority_score
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(
    __file__
).resolve().parents[2]

MODEL_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "best_model.pkl"
)

SCALER_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "scaler.pkl"
)

UPLOAD_FOLDER = (
    BASE_DIR
    / "data"
    / "uploads"
)

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# LOAD MODEL
# ============================================================

try:

    model = joblib.load(
        MODEL_PATH
    )

except Exception as e:

    raise RuntimeError(
        f"Could not load model: {e}"
    )


# ============================================================
# LOAD SCALER
# ============================================================

try:

    scaler = joblib.load(
        SCALER_PATH
    )

except Exception as e:

    raise RuntimeError(
        f"Could not load scaler: {e}"
    )


# ============================================================
# MODEL FEATURES
# ============================================================

if hasattr(
    scaler,
    "feature_names_in_"
):

    FEATURE_NAMES = (
        scaler
        .feature_names_in_
        .tolist()
    )

elif hasattr(
    model,
    "feature_names_in_"
):

    FEATURE_NAMES = (
        model
        .feature_names_in_
        .tolist()
    )

else:

    FEATURE_NAMES = []


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

initialize_database(
    FEATURE_NAMES
)

import_existing_dataset(
    FEATURE_NAMES
)

df = load_database()


print(
    f"Vehicle database loaded: {len(df)} records"
)

if not df.empty:

    print(
        "Vehicles:",
        sorted(
            df["battery_id"]
            .astype(str)
            .unique()
            .tolist()
        )
    )


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(

    title="EV Battery Intelligence API",

    description=(
        "AI-based EV Battery Health "
        "Prediction and Predictive Maintenance API"
    ),

    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {

        "message":
            "EV Battery Intelligence API is running!",

        "status":
            "online"
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health_check():

    return {

        "status":
            "healthy",

        "model_loaded":
            model is not None,

        "scaler_loaded":
            scaler is not None,

        "database_loaded":
            not df.empty,

        "database_rows":
            len(df)
    }


# ============================================================
# MODEL INFO
# ============================================================

@app.get("/model-info")
def model_info():

    return {

        "model":
            type(model).__name__,

        "scaler":
            type(scaler).__name__,

        "number_of_features":
            len(FEATURE_NAMES),

        "features":
            FEATURE_NAMES
    }


# ============================================================
# FEATURES
# ============================================================

@app.get("/features")
def get_features():

    if not FEATURE_NAMES:

        raise HTTPException(

            status_code=500,

            detail=
                "Model feature names could not be determined."
        )

    return {

        "number_of_features":
            len(FEATURE_NAMES),

        "features":
            FEATURE_NAMES
    }


# ============================================================
# AVAILABLE VEHICLES
# ============================================================

@app.get("/vehicles")
def get_vehicles():

    global df

    df = load_database()

    if df.empty:

        return {

            "number_of_vehicles":
                0,

            "vehicles":
                []
        }

    vehicles = sorted(

        df["battery_id"]
        .dropna()
        .astype(str)
        .str.strip()
        .str.upper()
        .unique()
        .tolist()
    )

    return {

        "number_of_vehicles":
            len(vehicles),

        "vehicles":
            vehicles
    }


# ============================================================
# ADD SINGLE VEHICLE RECORD
# ============================================================

@app.post("/vehicles")
def add_new_vehicle(
    data: dict
):

    global df

    if "battery_id" not in data:

        raise HTTPException(

            status_code=400,

            detail=
                "battery_id is required."
        )

    battery_id = (
        str(data["battery_id"])
        .strip()
        .upper()
    )

    if not battery_id:

        raise HTTPException(

            status_code=400,

            detail=
                "Vehicle ID cannot be empty."
        )

    if vehicle_exists(
        battery_id
    ):

        raise HTTPException(

            status_code=409,

            detail=
                f"Vehicle '{battery_id}' already exists."
        )

    missing_features = [

        feature

        for feature in FEATURE_NAMES

        if feature not in data
    ]

    if missing_features:

        raise HTTPException(

            status_code=400,

            detail={

                "message":
                    "Missing required battery features.",

                "missing_features":
                    missing_features
            }
        )

    record = {}

    for feature in FEATURE_NAMES:

        try:

            record[feature] = float(
                data[feature]
            )

        except (
            TypeError,
            ValueError
        ):

            raise HTTPException(

                status_code=400,

                detail={

                    "message":
                        "Invalid numeric value.",

                    "feature":
                        feature
                }
            )

    if "SOH_percent" in data:

        if data["SOH_percent"] in [
            None,
            ""
        ]:

            record[
                "SOH_percent"
            ] = None

        else:

            try:

                record[
                    "SOH_percent"
                ] = float(
                    data["SOH_percent"]
                )

            except (
                TypeError,
                ValueError
            ):

                raise HTTPException(

                    status_code=400,

                    detail=
                        "Invalid SOH_percent value."
                )

    try:

        add_vehicle_record(
            battery_id,
            record
        )

    except ValueError as e:

        raise HTTPException(

            status_code=409,

            detail=str(e)
        )

    df = load_database()

    return {

        "message":
            "Vehicle added successfully.",

        "battery_id":
            battery_id,

        "number_of_records":
            len(
                df[
                    df["battery_id"]
                    == battery_id
                ]
            )
    }


# ============================================================
# UPLOAD VEHICLE BATTERY DATA
# MAT OR PROCESSED CSV
# ============================================================

@app.post(
    "/vehicles/upload",
    summary="Upload Vehicle Battery Data"
)
async def upload_vehicle_data(

    battery_id: str = Form(...),

    file: UploadFile = File(...)
):

    global df

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    if not battery_id:

        raise HTTPException(

            status_code=400,

            detail=
                "Vehicle ID cannot be empty."
        )

    if not file.filename:

        raise HTTPException(

            status_code=400,

            detail=
                "No file selected."
        )

    if vehicle_exists(
        battery_id
    ):

        raise HTTPException(

            status_code=409,

            detail=
                f"Vehicle '{battery_id}' already exists."
        )

    filename = file.filename.lower()

    contents = await file.read()

    # ========================================================
    # MAT FILE
    # ========================================================

    if filename.endswith(".mat"):

        try:

            mat_data = scipy.io.loadmat(
                BytesIO(contents)
            )

        except Exception as e:

            raise HTTPException(

                status_code=400,

                detail=
                    f"Could not read MAT file: {e}"
            )

        # ----------------------------------------------------
        # Find NASA battery structure
        # ----------------------------------------------------

        battery_keys = [

            key

            for key in mat_data

            if not key.startswith("__")
        ]

        if not battery_keys:

            raise HTTPException(

                status_code=400,

                detail=
                    "MAT file does not contain a battery structure."
            )

        source_key = None

        for key in battery_keys:

            value = mat_data[key]

            if (
                isinstance(
                    value,
                    np.ndarray
                )
                and value.dtype.names
            ):

                if "cycle" in value.dtype.names:

                    source_key = key

                    break

        if source_key is None:

            raise HTTPException(

                status_code=400,

                detail=(
                    "Could not find a valid NASA "
                    "battery structure in the MAT file."
                )
            )

        # ----------------------------------------------------
        # Read cycles
        # ----------------------------------------------------

        try:

            battery = mat_data[
                source_key
            ]

            cycles = battery[
                "cycle"
            ][0, 0]

        except Exception as e:

            raise HTTPException(

                status_code=400,

                detail=
                    f"Invalid battery structure in MAT file: {e}"
            )

        # ----------------------------------------------------
        # Determine number of cycles
        # ----------------------------------------------------

        if cycles.ndim == 1:

            cycle_count = cycles.shape[0]

        else:

            cycle_count = cycles.shape[1]

        # ----------------------------------------------------
        # Find initial discharge capacity
        # ----------------------------------------------------

        initial_capacity = None

        for i in range(cycle_count):

            cycle = (

                cycles[i]

                if cycles.ndim == 1

                else cycles[0, i]
            )

            try:

                cycle_type = cycle[
                    "type"
                ][0]

                if hasattr(
                    cycle_type,
                    "item"
                ):

                    cycle_type = (
                        cycle_type.item()
                    )

                cycle_type = (
                    str(cycle_type)
                    .strip()
                    .lower()
                )

            except Exception:

                continue

            if cycle_type != "discharge":

                continue

            try:

                data = cycle[
                    "data"
                ]

                capacity = float(

                    np.asarray(

                        data[
                            "Capacity"
                        ][0, 0]

                    )
                    .flatten()[0]
                )

            except Exception:

                continue

            if capacity > 0:

                initial_capacity = capacity

                break

        if initial_capacity is None:

            raise HTTPException(

                status_code=400,

                detail=(
                    "No valid discharge cycle "
                    "with capacity was found."
                )
            )

        # ----------------------------------------------------
        # Extract discharge cycles
        # ----------------------------------------------------

        uploaded_records = []

        for i in range(cycle_count):

            cycle = (

                cycles[i]

                if cycles.ndim == 1

                else cycles[0, i]
            )

            try:

                cycle_type = cycle[
                    "type"
                ][0]

                if hasattr(
                    cycle_type,
                    "item"
                ):

                    cycle_type = (
                        cycle_type.item()
                    )

                cycle_type = (
                    str(cycle_type)
                    .strip()
                    .lower()
                )

            except Exception:

                continue

            if cycle_type != "discharge":

                continue

            try:

                data = cycle[
                    "data"
                ]

                voltage = np.asarray(

                    data[
                        "Voltage_measured"
                    ][0, 0],

                    dtype=float

                ).flatten()

                current = np.asarray(

                    data[
                        "Current_measured"
                    ][0, 0],

                    dtype=float

                ).flatten()

                temperature = np.asarray(

                    data[
                        "Temperature_measured"
                    ][0, 0],

                    dtype=float

                ).flatten()

                time = np.asarray(

                    data[
                        "Time"
                    ][0, 0],

                    dtype=float

                ).flatten()

                capacity = float(

                    np.asarray(

                        data[
                            "Capacity"
                        ][0, 0]

                    )
                    .flatten()[0]
                )

                if (

                    len(voltage) == 0

                    or len(current) == 0

                    or len(temperature) == 0

                    or len(time) == 0

                    or capacity <= 0
                ):

                    continue

                # IMPORTANT:
                # Keep the same cycle indexing
                # used by the trained model.

                cycle_number = i + 1

                soh = (
                    capacity
                    / initial_capacity
                ) * 100

                capacity_change = (
                    capacity
                    - initial_capacity
                )

                capacity_degradation_rate = (

                    (
                        initial_capacity
                        - capacity
                    )
                    / initial_capacity
                )

                uploaded_records.append({

                    "battery_id":
                        battery_id,

                    "cycle":
                        float(cycle_number),

                    "voltage_mean":
                        float(
                            np.mean(voltage)
                        ),

                    "voltage_min":
                        float(
                            np.min(voltage)
                        ),

                    "voltage_max":
                        float(
                            np.max(voltage)
                        ),

                    "voltage_std":
                        float(
                            np.std(voltage)
                        ),

                    "voltage_range":
                        float(
                            np.max(voltage)
                            - np.min(voltage)
                        ),

                    "current_mean":
                        float(
                            np.mean(current)
                        ),

                    "current_min":
                        float(
                            np.min(current)
                        ),

                    "current_max":
                        float(
                            np.max(current)
                        ),

                    "current_std":
                        float(
                            np.std(current)
                        ),

                    "temperature_mean":
                        float(
                            np.mean(temperature)
                        ),

                    "temperature_min":
                        float(
                            np.min(temperature)
                        ),

                    "temperature_max":
                        float(
                            np.max(temperature)
                        ),

                    "temperature_std":
                        float(
                            np.std(temperature)
                        ),

                    "discharge_duration":
                        float(
                            np.max(time)
                            - np.min(time)
                        ),

                    "capacity_Ah":
                        capacity,

                    "initial_capacity_Ah":
                        initial_capacity,

                    "capacity_change":
                        capacity_change,

                    "capacity_degradation_rate":
                        capacity_degradation_rate,

                    "SOH_percent":
                        float(soh)
                })

            except Exception:

                continue

        if not uploaded_records:

            raise HTTPException(

                status_code=400,

                detail=(
                    "No valid discharge records "
                    "could be extracted from the MAT file."
                )
            )

        # ----------------------------------------------------
        # Cycle progress
        # ----------------------------------------------------

        maximum_cycle = max(

            record["cycle"]

            for record in uploaded_records
        )

        for record in uploaded_records:

            record["cycle_progress"] = (

                record["cycle"]
                / maximum_cycle

            ) if maximum_cycle > 0 else 0.0

        source_format = "MAT"

    # ========================================================
    # CSV FILE
    # ========================================================

    elif filename.endswith(".csv"):

        try:

            uploaded_df = pd.read_csv(
                BytesIO(contents)
            )

        except Exception as e:

            raise HTTPException(

                status_code=400,

                detail=
                    f"Could not read CSV file: {e}"
            )

        uploaded_df.columns = [

            str(column).strip()

            for column in uploaded_df.columns
        ]

        missing_features = [

            feature

            for feature in FEATURE_NAMES

            if feature not in uploaded_df.columns
        ]

        if missing_features:

            raise HTTPException(

                status_code=400,

                detail={

                    "message":
                        "CSV does not contain all required ML features.",

                    "missing_features":
                        missing_features,

                    "required_features":
                        FEATURE_NAMES
                }
            )

        uploaded_records = []

        for _, row in uploaded_df.iterrows():

            record = {

                "battery_id":
                    battery_id
            }

            valid = True

            for feature in FEATURE_NAMES:

                value = pd.to_numeric(

                    row[feature],

                    errors="coerce"
                )

                if pd.isna(value):

                    valid = False

                    break

                record[feature] = float(
                    value
                )

            if not valid:

                continue

            if "SOH_percent" in uploaded_df.columns:

                value = pd.to_numeric(

                    row[
                        "SOH_percent"
                    ],

                    errors="coerce"
                )

                record[
                    "SOH_percent"
                ] = (

                    None

                    if pd.isna(value)

                    else float(value)
                )

            uploaded_records.append(
                record
            )

        if not uploaded_records:

            raise HTTPException(

                status_code=400,

                detail=
                    "CSV contains no valid battery records."
            )

        source_format = "CSV"

    else:

        raise HTTPException(

            status_code=400,

            detail=
                "Only MAT or CSV files are supported."
        )

    # ========================================================
    # INSERT RECORDS
    # ========================================================

    inserted = 0

    skipped = 0

    for record in uploaded_records:

        try:

            add_vehicle_record(

                battery_id,

                record
            )

            inserted += 1

        except ValueError:

            skipped += 1

    # --------------------------------------------------------
    # Reload database
    # --------------------------------------------------------

    df = load_database()

    vehicle_records = df[

        df["battery_id"]
        == battery_id

    ].copy()

    if vehicle_records.empty:

        raise HTTPException(

            status_code=400,

            detail=
                "No valid records were imported."
        )

    return {

        "message":
            "Vehicle battery data uploaded successfully.",

        "battery_id":
            battery_id,

        "filename":
            file.filename,

        "source_format":
            source_format,

        "source_battery":
            (
                source_key
                if filename.endswith(".mat")
                else None
            ),

        "initial_capacity_Ah":
            (
                round(
                    float(
                        vehicle_records[
                            "initial_capacity_Ah"
                        ].iloc[0]
                    ),
                    4
                )

                if "initial_capacity_Ah"
                in vehicle_records.columns

                else None
            ),

        "records_inserted":
            inserted,

        "records_skipped":
            skipped,

        "total_records":
            len(vehicle_records),

        "available_for_prediction":
            True
    }


# ============================================================
# GET LATEST VEHICLE
# ============================================================

@app.get(
    "/vehicles/{battery_id}"
)
def get_vehicle(
    battery_id: str
):

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    vehicle_data = df[

        df["battery_id"]
        == battery_id

    ].copy()

    if vehicle_data.empty:

        raise HTTPException(

            status_code=404,

            detail=
                f"Vehicle '{battery_id}' not found."
        )

    vehicle_data = (

        vehicle_data

        .sort_values("cycle")

        .reset_index(drop=True)
    )

    latest = vehicle_data.iloc[-1]

    latest_cycle = int(
        latest["cycle"]
    )

    parameters = {}

    for feature in FEATURE_NAMES:

        if feature not in vehicle_data.columns:

            continue

        value = latest[feature]

        if pd.isna(value):

            parameters[feature] = None

        else:

            parameters[feature] = float(
                value
            )

    soh = None

    if "SOH_percent" in vehicle_data.columns:

        value = latest[
            "SOH_percent"
        ]

        if not pd.isna(value):

            soh = round(
                float(value),
                2
            )

    return {

        "battery_id":
            battery_id,

        "latest_cycle":
            latest_cycle,

        "cycle":
            latest_cycle,

        "total_records":
            len(vehicle_data),

        "parameters":
            parameters,

        "soh_percent":
            soh,

        "first_cycle":
            int(
                vehicle_data[
                    "cycle"
                ].iloc[0]
            ),

        "last_cycle":
            latest_cycle
    }


# ============================================================
# VEHICLE HISTORY
# ============================================================

@app.get(
    "/vehicles/{battery_id}/history"
)
def get_vehicle_history(
    battery_id: str
):

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    vehicle_data = df[

        df["battery_id"]
        == battery_id

    ].copy()

    if vehicle_data.empty:

        raise HTTPException(

            status_code=404,

            detail=
                f"Vehicle '{battery_id}' not found."
        )

    vehicle_data = (

        vehicle_data

        .sort_values("cycle")

        .reset_index(drop=True)
    )

    history = []

    for _, row in vehicle_data.iterrows():

        item = {}

        if (
            "cycle" in row
            and not pd.isna(
                row["cycle"]
            )
        ):

            item["cycle"] = int(
                row["cycle"]
            )

        else:

            item["cycle"] = None

        for feature in FEATURE_NAMES:

            if feature not in row:

                continue

            value = row[feature]

            if pd.isna(value):

                item[feature] = None

            else:

                item[feature] = float(
                    value
                )

        if "SOH_percent" in row:

            value = row[
                "SOH_percent"
            ]

            if pd.isna(value):

                item[
                    "SOH_percent"
                ] = None

            else:

                item[
                    "SOH_percent"
                ] = round(
                    float(value),
                    4
                )

        history.append(item)

    return {

        "battery_id":
            battery_id,

        "number_of_records":
            len(history),

        "first_cycle":
            (
                history[0]["cycle"]
                if history
                else None
            ),

        "last_cycle":
            (
                history[-1]["cycle"]
                if history
                else None
            ),

        "history":
            history
    }


# ============================================================
# SOH TREND
# ============================================================

@app.get(
    "/vehicles/{battery_id}/trend"
)
def get_vehicle_trend(
    battery_id: str
):

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    vehicle_data = df[

        df["battery_id"]
        == battery_id

    ].copy()

    if vehicle_data.empty:

        raise HTTPException(

            status_code=404,

            detail=
                f"Vehicle '{battery_id}' not found."
        )

    if "SOH_percent" not in vehicle_data.columns:

        raise HTTPException(

            status_code=500,

            detail=
                "SOH_percent column not found."
        )

    vehicle_data = (

        vehicle_data

        .sort_values("cycle")

        .reset_index(drop=True)
    )

    trend_data = (

        vehicle_data[
            [
                "cycle",
                "SOH_percent"
            ]
        ]

        .dropna()

        .copy()
    )

    if trend_data.empty:

        raise HTTPException(

            status_code=500,

            detail=
                "No valid SOH data available."
        )

    initial_soh = float(
        trend_data[
            "SOH_percent"
        ].iloc[0]
    )

    current_soh = float(
        trend_data[
            "SOH_percent"
        ].iloc[-1]
    )

    soh_degradation = (
        initial_soh
        - current_soh
    )

    if initial_soh != 0:

        degradation_percentage = (

            soh_degradation
            / initial_soh

        ) * 100

    else:

        degradation_percentage = 0

    first_cycle = int(
        trend_data[
            "cycle"
        ].iloc[0]
    )

    last_cycle = int(
        trend_data[
            "cycle"
        ].iloc[-1]
    )

    total_records = len(
        trend_data
    )

    if current_soh < initial_soh:

        trend_direction = "decreasing"

    elif current_soh > initial_soh:

        trend_direction = "increasing"

    else:

        trend_direction = "stable"

    data = [

        {

            "cycle":
                int(row["cycle"]),

            "soh_percent":
                round(
                    float(
                        row["SOH_percent"]
                    ),
                    4
                )
        }

        for _, row
        in trend_data.iterrows()
    ]

    return {

        "battery_id":
            battery_id,

        "initial_soh_percent":
            round(
                initial_soh,
                2
            ),

        "current_soh_percent":
            round(
                current_soh,
                2
            ),

        "soh_degradation_percent":
            round(
                soh_degradation,
                2
            ),

        "degradation_percentage":
            round(
                degradation_percentage,
                2
            ),

        "first_cycle":
            first_cycle,

        "last_cycle":
            last_cycle,

        "total_records":
            total_records,

        "trend":
            trend_direction,

        "data":
            data
    }



# ============================================================
# REMAINING USEFUL LIFE (RUL)
# ============================================================

@app.get("/vehicles/{battery_id}/rul")
def get_vehicle_rul(battery_id: str):
    """
    Estimate Remaining Useful Life (RUL) from the recent SOH
    degradation trend.

    EOL threshold:
        70% SOH

    RUL:
        Estimated number of cycles remaining before the battery
        reaches the 70% SOH threshold.
    """

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    # --------------------------------------------------------
    # Get vehicle data
    # --------------------------------------------------------

    vehicle_data = df[
        df["battery_id"] == battery_id
    ].copy()

    if vehicle_data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Vehicle '{battery_id}' not found."
        )

    if "SOH_percent" not in vehicle_data.columns:
        raise HTTPException(
            status_code=500,
            detail="SOH_percent column not found."
        )

    # --------------------------------------------------------
    # Prepare SOH history
    # --------------------------------------------------------

    trend_data = (
        vehicle_data[
            [
                "cycle",
                "SOH_percent"
            ]
        ]
        .dropna()
        .copy()
    )

    trend_data = (
        trend_data
        .sort_values("cycle")
        .reset_index(drop=True)
    )

    if len(trend_data) < 5:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least 5 valid SOH records are required "
                "to estimate RUL."
            )
        )

    # --------------------------------------------------------
    # Current battery state
    # --------------------------------------------------------

    current_cycle = int(
        trend_data["cycle"].iloc[-1]
    )

    current_soh = float(
        trend_data["SOH_percent"].iloc[-1]
    )

    # 70% SOH corresponds to 30% capacity fade.
    EOL_SOH = 70.0

    # --------------------------------------------------------
    # Use recent history for the degradation trend
    # --------------------------------------------------------

    window_size = min(
        30,
        len(trend_data)
    )

    recent = (
        trend_data
        .tail(window_size)
        .copy()
    )

    cycles = (
        recent["cycle"]
        .astype(float)
        .to_numpy()
    )

    soh_values = (
        recent["SOH_percent"]
        .astype(float)
        .to_numpy()
    )

    # --------------------------------------------------------
    # Fit a linear degradation trend
    # SOH = slope * cycle + intercept
    # --------------------------------------------------------

    slope, intercept = np.polyfit(
        cycles,
        soh_values,
        1
    )

    slope = float(slope)
    intercept = float(intercept)

    # --------------------------------------------------------
    # Calculate R² of the recent trend
    # --------------------------------------------------------

    fitted_values = (
        slope * cycles
        + intercept
    )

    ss_res = float(
        np.sum(
            (soh_values - fitted_values) ** 2
        )
    )

    ss_tot = float(
        np.sum(
            (
                soh_values
                - np.mean(soh_values)
            ) ** 2
        )
    )

    if ss_tot > 0:
        r_squared = 1.0 - (
            ss_res / ss_tot
        )
    else:
        r_squared = 0.0

    r_squared = max(
        0.0,
        min(
            1.0,
            r_squared
        )
    )

    # --------------------------------------------------------
    # Degradation rate
    # --------------------------------------------------------

    degradation_rate = abs(slope)

    # --------------------------------------------------------
    # Estimate RUL
    # --------------------------------------------------------

    if current_soh <= EOL_SOH:

        rul_cycles = 0
        estimated_eol_cycle = current_cycle
        rul_status = "EOL threshold reached"
        confidence = "High"

    elif slope >= 0:

        # Battery is not showing a decreasing SOH trend.
        rul_cycles = None
        estimated_eol_cycle = None
        rul_status = "Insufficient degradation trend"
        confidence = "Low"

    else:

        # Solve:
        #
        # EOL_SOH = slope * EOL_cycle + intercept
        #
        # EOL_cycle =
        # (EOL_SOH - intercept) / slope

        eol_cycle_from_trend = (
            EOL_SOH - intercept
        ) / slope

        cycles_to_eol = (
            eol_cycle_from_trend
            - current_cycle
        )

        if cycles_to_eol <= 0:

            rul_cycles = 0
            estimated_eol_cycle = current_cycle

        else:

            rul_cycles = int(
                round(cycles_to_eol)
            )

            rul_cycles = max(
                0,
                rul_cycles
            )

            estimated_eol_cycle = (
                current_cycle
                + rul_cycles
            )

        # ----------------------------------------------------
        # Confidence
        # ----------------------------------------------------

        if r_squared >= 0.80:
            confidence = "High"

        elif r_squared >= 0.50:
            confidence = "Medium"

        else:
            confidence = "Low"

        # ----------------------------------------------------
        # RUL status
        # ----------------------------------------------------

        if rul_cycles <= 50:
            rul_status = "Near end of useful life"

        elif rul_cycles <= 150:
            rul_status = "Monitor closely"

        else:
            rul_status = "Healthy remaining life"

    # --------------------------------------------------------
    # Future SOH projections
    # --------------------------------------------------------

    projections = []

    if slope < 0:

        projection_cycles = [
            current_cycle + 25,
            current_cycle + 50,
            current_cycle + 100
        ]

        for future_cycle in projection_cycles:

            future_soh = (
                slope * future_cycle
                + intercept
            )

            future_soh = max(
                0.0,
                min(
                    100.0,
                    future_soh
                )
            )

            projections.append({
                "cycle": int(
                    future_cycle
                ),
                "predicted_soh_percent": round(
                    float(future_soh),
                    2
                )
            })

    # --------------------------------------------------------
    # Response
    # --------------------------------------------------------

    return {
        "battery_id":
            battery_id,

        "current_cycle":
            current_cycle,

        "current_soh_percent":
            round(
                current_soh,
                2
            ),

        "eol_soh_threshold_percent":
            EOL_SOH,

        "degradation_rate_percent_per_cycle":
            round(
                degradation_rate,
                6
            ),

        "trend_slope_percent_per_cycle":
            round(
                slope,
                6
            ),

        "trend_intercept":
            round(
                intercept,
                4
            ),

        "trend_r_squared":
            round(
                r_squared,
                4
            ),

        "estimated_eol_cycle":
            estimated_eol_cycle,

        "remaining_useful_life_cycles":
            rul_cycles,

        "rul_status":
            rul_status,

        "confidence":
            confidence,

        "trend_window_cycles":
            window_size,

        "future_projections":
            projections,

        "method":
            (
                "Recent SOH linear degradation trend "
                "with 70% SOH EOL threshold"
            )
    }


# ============================================================
# REAL-TIME TELEMETRY SIMULATOR
# ============================================================
# The project currently uses historical battery data. This endpoint
# provides a clearly simulated live telemetry stream for demonstration.
# It perturbs the latest real battery record and runs the same ML model
# on every request. A real BMS/MQTT/vehicle gateway can replace this
# simulator later without changing the frontend contract.

@app.get("/telemetry/{battery_id}")
def get_realtime_telemetry(battery_id: str):

    global df

    battery_id = str(battery_id).strip().upper()
    live_df = load_database()

    vehicle_data = live_df[
        live_df["battery_id"].astype(str).str.strip().str.upper() == battery_id
    ].copy()

    if vehicle_data.empty:
        raise HTTPException(
            status_code=404,
            detail=f"Vehicle '{battery_id}' not found."
        )

    vehicle_data = vehicle_data.sort_values("cycle").reset_index(drop=True)
    latest = vehicle_data.iloc[-1].copy()

    # Deterministic vehicle-specific phase so different vehicles do not
    # look identical while the same vehicle remains stable between polls.
    vehicle_seed = sum(ord(ch) for ch in battery_id)
    now = datetime.now(timezone.utc)
    elapsed = now.timestamp()
    phase = (elapsed / 6.0) + (vehicle_seed % 17)

    def numeric(field, default):
        try:
            value = float(latest[field])
            if math.isfinite(value):
                return value
        except Exception:
            pass
        return float(default)

    base_voltage = numeric("voltage_mean", 3.7)
    base_current = numeric("current_mean", -1.5)
    base_temperature = numeric("temperature_mean", 30.0)
    base_cycle = int(round(numeric("cycle", 0)))
    base_capacity = numeric("capacity_Ah", 0.0)
    current_soh = numeric("SOH_percent", 100.0)

    # Small realistic-looking fluctuations.
    voltage = base_voltage + 0.018 * math.sin(phase)
    current = base_current + 1.8 * math.sin(phase * 0.73)

    # A periodic thermal event makes anomaly detection visible during demos.
    anomaly_window = int(elapsed // 45) % 4 == 2
    thermal_spike = 7.0 if anomaly_window else 0.0
    temperature = (
        base_temperature
        + 1.8 * math.sin(phase * 0.41)
        + thermal_spike
    )

    # Simulated SOC is intentionally separate from the historical dataset.
    soc = 62.0 + 22.0 * math.sin(phase * 0.16 + 1.2)
    soc = max(5.0, min(98.0, soc))

    power_kw = abs(voltage * current) / 1000.0
    if power_kw < 0.05:
        power_kw = 0.05

    # Run the production ML model using the latest real feature vector,
    # replacing the live-measurable fields with current telemetry.
    predicted_soh = current_soh
    prediction_error = None

    try:
        live_values = []
        for feature in FEATURE_NAMES:
            value = latest[feature]

            if feature == "voltage_mean":
                value = voltage
            elif feature == "voltage_min":
                value = voltage - 0.04
            elif feature == "voltage_max":
                value = voltage + 0.04
            elif feature == "voltage_std":
                value = max(0.001, numeric("voltage_std", 0.03))
            elif feature == "voltage_range":
                value = 0.08
            elif feature == "current_mean":
                value = current
            elif feature == "current_min":
                value = current - 1.5
            elif feature == "current_max":
                value = current + 1.5
            elif feature == "current_std":
                value = max(0.001, numeric("current_std", 0.5))
            elif feature == "temperature_mean":
                value = temperature
            elif feature == "temperature_min":
                value = temperature - 2.0
            elif feature == "temperature_max":
                value = temperature + 2.0
            elif feature == "temperature_std":
                value = max(0.1, numeric("temperature_std", 0.8))
            elif feature == "cycle":
                value = base_cycle

            if pd.isna(value):
                raise ValueError(f"Missing feature value: {feature}")

            live_values.append(float(value))

        input_data = pd.DataFrame([live_values], columns=FEATURE_NAMES)
        scaled_array = scaler.transform(input_data)
        scaled_data = pd.DataFrame(scaled_array, columns=FEATURE_NAMES)
        predicted_soh = float(model.predict(scaled_data)[0])
        predicted_soh = max(0.0, min(100.0, predicted_soh))
        prediction_error = predicted_soh - current_soh

    except Exception as exc:
        print(f"Real-time prediction error for {battery_id}: {exc}")
        predicted_soh = current_soh

    # Operational risk combines battery health and the live thermal signal.
    if temperature >= 50 or predicted_soh < 40:
        risk_level = "CRITICAL"
    elif temperature >= 45 or predicted_soh < 60:
        risk_level = "HIGH"
    elif temperature >= 40 or predicted_soh < 80:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    anomaly = temperature >= 45 or abs(current - base_current) >= 4.0

    if anomaly:
        status = "Anomaly detected"
        recommendation = "Inspect battery thermal/current conditions."
    elif risk_level in ("CRITICAL", "HIGH"):
        status = "Attention required"
        recommendation = "Schedule maintenance review."
    else:
        status = "Normal"
        recommendation = "Continue monitoring."

    return {
        "battery_id": battery_id,
        "timestamp": now.isoformat(),
        "source": "simulated_telemetry",
        "live": True,
        "cycle": base_cycle,
        "voltage_v": round(voltage, 3),
        "current_a": round(current, 2),
        "temperature_c": round(temperature, 2),
        "soc_percent": round(soc, 1),
        "power_kw": round(power_kw, 3),
        "capacity_Ah": round(base_capacity, 4),
        "current_soh_percent": round(current_soh, 2),
        "predicted_soh_percent": round(predicted_soh, 2),
        "prediction_delta_percent": round(prediction_error, 2) if prediction_error is not None else None,
        "risk_level": risk_level,
        "anomaly": anomaly,
        "status": status,
        "recommendation": recommendation,
        "thermal_event": anomaly_window,
        "update_interval_seconds": 2,
    }

# ============================================================
# SOH PREDICTION
# ============================================================

@app.get(
    "/vehicles/{battery_id}/prediction"
)
def vehicle_prediction(
    battery_id: str
):

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    if not FEATURE_NAMES:

        raise HTTPException(

            status_code=500,

            detail=
                "Model feature names are unavailable."
        )

    vehicle_data = df[

        df["battery_id"]
        == battery_id

    ].copy()

    if vehicle_data.empty:

        raise HTTPException(

            status_code=404,

            detail=
                f"Vehicle '{battery_id}' not found."
        )

    vehicle_data = (

        vehicle_data

        .sort_values("cycle")

        .reset_index(drop=True)
    )

    latest = vehicle_data.iloc[-1]

    missing_features = [

        feature

        for feature in FEATURE_NAMES

        if feature not in latest.index
    ]

    if missing_features:

        raise HTTPException(

            status_code=500,

            detail={

                "message":
                    "Required model features are missing.",

                "missing_features":
                    missing_features
            }
        )

    values = []

    for feature in FEATURE_NAMES:

        value = latest[feature]

        if pd.isna(value):

            raise HTTPException(

                status_code=500,

                detail={

                    "message":
                        "Latest vehicle record contains "
                        "a missing model feature.",

                    "feature":
                        feature
                }
            )

        try:

            values.append(
                float(value)
            )

        except (
            TypeError,
            ValueError
        ):

            raise HTTPException(

                status_code=500,

                detail={

                    "message":
                        "Invalid feature value.",

                    "feature":
                        feature
                }
            )

    input_data = pd.DataFrame(

        [values],

        columns=FEATURE_NAMES
    )

    scaled_array = scaler.transform(
        input_data
    )

    # Keep the feature names after scaling so the model
    # receives the same named columns it saw during training.
    scaled_data = pd.DataFrame(
        scaled_array,
        columns=FEATURE_NAMES,
        index=input_data.index
    )

    prediction = model.predict(
        scaled_data
    )

    predicted_soh = float(
        prediction[0]
    )

    predicted_soh = max(

        0.0,

        min(
            100.0,
            predicted_soh
        )
    )

    actual_soh = None

    if "SOH_percent" in latest.index:

        value = latest[
            "SOH_percent"
        ]

        if not pd.isna(value):

            actual_soh = float(value)

    error = None

    if actual_soh is not None:

        error = (
            actual_soh
            - predicted_soh
        )

    return {

        "battery_id":
            battery_id,

        "cycle":
            int(
                latest["cycle"]
            ),

        "actual_soh_percent":
            (
                round(
                    actual_soh,
                    2
                )

                if actual_soh is not None

                else None
            ),

        "predicted_soh_percent":
            round(
                predicted_soh,
                2
            ),

        "prediction_error_percent":
            (
                round(
                    error,
                    2
                )

                if error is not None

                else None
            ),

        "model":
            type(model).__name__,

        "number_of_features":
            len(FEATURE_NAMES)
    }


# ============================================================
# FLEET MONITORING
# ============================================================

@app.get("/fleet")
def get_fleet():

    global df

    df = load_database()

    fleet = []

    if df.empty:

        return {

            "summary": {

                "total_vehicles":
                    0,

                "average_soh_percent":
                    None,

                "excellent":
                    0,

                "good":
                    0,

                "fair":
                    0,

                "critical":
                    0
            },

            "fleet":
                []
        }

    battery_ids = sorted(

        df["battery_id"]
        .astype(str)
        .str.strip()
        .str.upper()
        .unique()
        .tolist()
    )

    for battery_id in battery_ids:

        vehicle_data = df[

            df["battery_id"]
            == battery_id

        ].copy()

        if vehicle_data.empty:

            continue

        vehicle_data = (

            vehicle_data

            .sort_values("cycle")

            .reset_index(drop=True)
        )

        first = vehicle_data.iloc[0]

        latest = vehicle_data.iloc[-1]

        # ----------------------------------------------------
        # Initial SOH
        # ----------------------------------------------------

        initial_soh = None

        if "SOH_percent" in vehicle_data.columns:

            value = first[
                "SOH_percent"
            ]

            if not pd.isna(value):

                initial_soh = float(
                    value
                )

        # ----------------------------------------------------
        # Current SOH
        # ----------------------------------------------------

        current_soh = None

        if "SOH_percent" in vehicle_data.columns:

            value = latest[
                "SOH_percent"
            ]

            if not pd.isna(value):

                current_soh = float(
                    value
                )

        # ----------------------------------------------------
        # Degradation
        # ----------------------------------------------------

        degradation = None

        if (
            initial_soh is not None
            and current_soh is not None
        ):

            degradation = (
                initial_soh
                - current_soh
            )

        # ----------------------------------------------------
        # Capacity
        # ----------------------------------------------------

        capacity = None

        if "capacity_Ah" in latest.index:

            value = latest[
                "capacity_Ah"
            ]

            if not pd.isna(value):

                capacity = float(
                    value
                )

        # ----------------------------------------------------
        # Cycle
        # ----------------------------------------------------

        cycle = int(
            latest["cycle"]
        )

        # ----------------------------------------------------
        # Status
        # ----------------------------------------------------

        if current_soh is None:

            status = "Unknown"

        elif current_soh >= 90:

            status = "Excellent"

        elif current_soh >= 80:

            status = "Good"

        elif current_soh >= 70:

            status = "Fair"

        else:

            status = "Critical"

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        predicted_soh = None

        try:

            values = []

            valid_features = True

            for feature in FEATURE_NAMES:

                if feature not in latest.index:

                    valid_features = False

                    break

                value = latest[
                    feature
                ]

                if pd.isna(value):

                    valid_features = False

                    break

                values.append(
                    float(value)
                )

            if valid_features:

                input_data = pd.DataFrame(

                    [values],

                    columns=FEATURE_NAMES
                )

                scaled_array = scaler.transform(
                    input_data
                )

                # Keep feature names after scaling.
                scaled_data = pd.DataFrame(
                    scaled_array,
                    columns=FEATURE_NAMES,
                    index=input_data.index
                )

                prediction = model.predict(
                    scaled_data
                )

                predicted_soh = float(
                    prediction[0]
                )

                predicted_soh = max(

                    0.0,

                    min(
                        100.0,
                        predicted_soh
                    )
                )

        except Exception:

            predicted_soh = None

        # ----------------------------------------------------
        # Prediction error
        # ----------------------------------------------------

        prediction_error = None

        if (
            predicted_soh is not None
            and current_soh is not None
        ):

            prediction_error = (
                current_soh
                - predicted_soh
            )

        # ----------------------------------------------------
        # Fleet record
        # ----------------------------------------------------

        fleet.append({

            "battery_id":
                battery_id,

            "initial_soh_percent":
                (
                    round(
                        initial_soh,
                        2
                    )

                    if initial_soh is not None

                    else None
                ),

            "current_soh_percent":
                (
                    round(
                        current_soh,
                        2
                    )

                    if current_soh is not None

                    else None
                ),

            "predicted_soh_percent":
                (
                    round(
                        predicted_soh,
                        2
                    )

                    if predicted_soh is not None

                    else None
                ),

            "degradation_percent":
                (
                    round(
                        degradation,
                        2
                    )

                    if degradation is not None

                    else None
                ),

            "prediction_error_percent":
                (
                    round(
                        prediction_error,
                        2
                    )

                    if prediction_error is not None

                    else None
                ),

            "cycle":
                cycle,

            "capacity_Ah":
                (
                    round(
                        capacity,
                        4
                    )

                    if capacity is not None

                    else None
                ),

            "total_records":
                len(vehicle_data),

            "status":
                status
        })

    # ========================================================
    # SUMMARY
    # ========================================================

    total_vehicles = len(
        fleet
    )

    excellent = sum(

        1

        for item in fleet

        if item["status"]
        == "Excellent"
    )

    good = sum(

        1

        for item in fleet

        if item["status"]
        == "Good"
    )

    fair = sum(

        1

        for item in fleet

        if item["status"]
        == "Fair"
    )

    critical = sum(

        1

        for item in fleet

        if item["status"]
        == "Critical"
    )

    valid_soh = [

        item[
            "current_soh_percent"
        ]

        for item in fleet

        if item[
            "current_soh_percent"
        ] is not None
    ]

    average_soh = None

    if valid_soh:

        average_soh = (

            sum(valid_soh)
            / len(valid_soh)
        )

    return {

        "summary": {

            "total_vehicles":
                total_vehicles,

            "average_soh_percent":
                (
                    round(
                        average_soh,
                        2
                    )

                    if average_soh is not None

                    else None
                ),

            "excellent":
                excellent,

            "good":
                good,

            "fair":
                fair,

            "critical":
                critical
        },

        "fleet":
            fleet
    }


# ============================================================
# MAINTENANCE INTELLIGENCE
# ============================================================

@app.get("/maintenance")
def get_maintenance():

    global df

    df = load_database()

    if df.empty:

        return {

            "summary": {

                "total_vehicles":
                    0,

                "low":
                    0,

                "medium":
                    0,

                "high":
                    0,

                "critical":
                    0,

                "maintenance_required":
                    0
            },

            "maintenance":
                []
        }

    maintenance_list = []

    battery_ids = sorted(

        df["battery_id"]
        .astype(str)
        .str.strip()
        .str.upper()
        .unique()
        .tolist()
    )

    for battery_id in battery_ids:

        vehicle_data = df[

            df["battery_id"]
            == battery_id

        ].copy()

        if vehicle_data.empty:

            continue

        vehicle_data = (

            vehicle_data

            .sort_values("cycle")

            .reset_index(drop=True)
        )

        first = vehicle_data.iloc[0]

        latest = vehicle_data.iloc[-1]

        # ----------------------------------------------------
        # SOH
        # ----------------------------------------------------

        initial_soh = None

        current_soh = None

        if "SOH_percent" in vehicle_data.columns:

            first_value = first[
                "SOH_percent"
            ]

            latest_value = latest[
                "SOH_percent"
            ]

            if not pd.isna(first_value):

                initial_soh = float(
                    first_value
                )

            if not pd.isna(latest_value):

                current_soh = float(
                    latest_value
                )

        # ----------------------------------------------------
        # Degradation
        # ----------------------------------------------------

        degradation = None

        if (
            initial_soh is not None
            and current_soh is not None
        ):

            degradation = (
                initial_soh
                - current_soh
            )

        # ----------------------------------------------------
        # Cycle
        # ----------------------------------------------------

        cycle = None

        if "cycle" in latest.index:

            if not pd.isna(
                latest["cycle"]
            ):

                cycle = int(
                    latest["cycle"]
                )

        # ----------------------------------------------------
        # Temperature
        # ----------------------------------------------------

        temperature_max = None

        if "temperature_max" in latest.index:

            value = latest[
                "temperature_max"
            ]

            if not pd.isna(value):

                temperature_max = float(
                    value
                )

        temperature_mean = None

        if "temperature_mean" in latest.index:

            value = latest[
                "temperature_mean"
            ]

            if not pd.isna(value):

                temperature_mean = float(
                    value
                )

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        predicted_soh = None

        try:

            values = []

            valid_features = True

            for feature in FEATURE_NAMES:

                if feature not in latest.index:

                    valid_features = False

                    break

                value = latest[
                    feature
                ]

                if pd.isna(value):

                    valid_features = False

                    break

                values.append(
                    float(value)
                )

            if valid_features:

                input_data = pd.DataFrame(

                    [values],

                    columns=FEATURE_NAMES
                )

                scaled_array = scaler.transform(
                    input_data
                )

                # Keep feature names after scaling.
                scaled_data = pd.DataFrame(
                    scaled_array,
                    columns=FEATURE_NAMES,
                    index=input_data.index
                )

                prediction = model.predict(
                    scaled_data
                )

                predicted_soh = float(
                    prediction[0]
                )

                predicted_soh = max(

                    0.0,

                    min(
                        100.0,
                        predicted_soh
                    )
                )

        except Exception:

            predicted_soh = None

        # ----------------------------------------------------
        # Prediction error
        # ----------------------------------------------------

        prediction_error = None

        if (
            predicted_soh is not None
            and current_soh is not None
        ):

            prediction_error = (
                current_soh
                - predicted_soh
            )

        # ----------------------------------------------------
        # Calculate risk
        # ----------------------------------------------------

        risk = calculate_maintenance_risk(

            current_soh=current_soh,

            degradation=degradation,

            predicted_soh=predicted_soh,

            prediction_error=prediction_error,

            temperature_max=temperature_max,

            temperature_mean=temperature_mean,

            cycle=cycle
        )

        # ----------------------------------------------------
        # Priority
        # ----------------------------------------------------

        priority_score = calculate_priority_score(

            risk_score=
                risk["risk_score"],

            current_soh=
                current_soh,

            degradation=
                degradation
        )

        maintenance_list.append({

            "battery_id":
                battery_id,

            "risk_level":
                risk["risk_level"],

            "risk_score":
                risk["risk_score"],

            "priority_score":
                priority_score,

            "maintenance_required":
                risk[
                    "maintenance_required"
                ],

            "recommendation":
                risk[
                    "recommendation"
                ],

            "reason":
                risk[
                    "reason"
                ],

            "risk_factors":
                risk[
                    "risk_factors"
                ],

            "current_soh_percent":
                (
                    round(
                        current_soh,
                        2
                    )

                    if current_soh is not None

                    else None
                ),

            "predicted_soh_percent":
                (
                    round(
                        predicted_soh,
                        2
                    )

                    if predicted_soh is not None

                    else None
                ),

            "degradation_percent":
                (
                    round(
                        degradation,
                        2
                    )

                    if degradation is not None

                    else None
                ),

            "prediction_error_percent":
                (
                    round(
                        prediction_error,
                        2
                    )

                    if prediction_error is not None

                    else None
                ),

            "temperature_max":
                (
                    round(
                        temperature_max,
                        2
                    )

                    if temperature_max is not None

                    else None
                ),

            "temperature_mean":
                (
                    round(
                        temperature_mean,
                        2
                    )

                    if temperature_mean is not None

                    else None
                ),

            "cycle":
                cycle
        })

    # ========================================================
    # SORT BY PRIORITY
    # ========================================================

    maintenance_list.sort(

        key=lambda item:
            item["priority_score"],

        reverse=True
    )

    # ========================================================
    # SUMMARY
    # ========================================================

    low = sum(

        1

        for item in maintenance_list

        if item["risk_level"] == "LOW"
    )

    medium = sum(

        1

        for item in maintenance_list

        if item["risk_level"] == "MEDIUM"
    )

    high = sum(

        1

        for item in maintenance_list

        if item["risk_level"] == "HIGH"
    )

    critical = sum(

        1

        for item in maintenance_list

        if item["risk_level"] == "CRITICAL"
    )

    maintenance_required = sum(

        1

        for item in maintenance_list

        if item["maintenance_required"]
    )

    return {

        "summary": {

            "total_vehicles":
                len(maintenance_list),

            "low":
                low,

            "medium":
                medium,

            "high":
                high,

            "critical":
                critical,

            "maintenance_required":
                maintenance_required
        },

        "maintenance":
            maintenance_list
    }


# ============================================================
# SINGLE VEHICLE MAINTENANCE
# ============================================================

@app.get(
    "/vehicles/{battery_id}/maintenance"
)
def get_vehicle_maintenance(
    battery_id: str
):

    global df

    # --------------------------------------------------------
    # IMPORTANT:
    # Always reload the latest database.
    # This ensures newly uploaded vehicles are available.
    # --------------------------------------------------------

    df = load_database()

    battery_id = (
        battery_id
        .strip()
        .upper()
    )

    vehicle_data = df[
        df["battery_id"]
        .astype(str)
        .str.strip()
        .str.upper()
        == battery_id
    ].copy()

    if vehicle_data.empty:

        raise HTTPException(

            status_code=404,

            detail=
                f"Vehicle '{battery_id}' not found."
        )

    # --------------------------------------------------------
    # Sort by cycle
    # --------------------------------------------------------

    vehicle_data = (

        vehicle_data

        .sort_values("cycle")

        .reset_index(drop=True)
    )

    first = vehicle_data.iloc[0]

    latest = vehicle_data.iloc[-1]

    # --------------------------------------------------------
    # Initial SOH
    # --------------------------------------------------------

    initial_soh = None

    if "SOH_percent" in vehicle_data.columns:

        value = first["SOH_percent"]

        if not pd.isna(value):

            initial_soh = float(value)

    # --------------------------------------------------------
    # Current SOH
    # --------------------------------------------------------

    current_soh = None

    if "SOH_percent" in vehicle_data.columns:

        value = latest["SOH_percent"]

        if not pd.isna(value):

            current_soh = float(value)

    # --------------------------------------------------------
    # Degradation
    # --------------------------------------------------------

    degradation = None

    if (
        initial_soh is not None
        and current_soh is not None
    ):

        degradation = (
            initial_soh
            - current_soh
        )

    # --------------------------------------------------------
    # Prediction
    # --------------------------------------------------------

    predicted_soh = None

    try:

        values = []

        for feature in FEATURE_NAMES:

            if feature not in latest.index:

                raise ValueError(
                    f"Missing feature: {feature}"
                )

            value = latest[feature]

            if pd.isna(value):

                raise ValueError(
                    f"Missing feature value: {feature}"
                )

            values.append(float(value))

        input_data = pd.DataFrame(
            [values],
            columns=FEATURE_NAMES
        )

        # Keep feature names during scaling
        scaled_array = scaler.transform(
            input_data
        )

        scaled_data = pd.DataFrame(
            scaled_array,
            columns=FEATURE_NAMES
        )

        predicted_soh = float(
            model.predict(scaled_data)[0]
        )

        predicted_soh = max(
            0.0,
            min(
                100.0,
                predicted_soh
            )
        )

    except Exception as e:

        print(
            f"Prediction error for "
            f"{battery_id}: {e}"
        )

        predicted_soh = None

    # --------------------------------------------------------
    # Prediction error
    # --------------------------------------------------------

    prediction_error = None

    if (
        predicted_soh is not None
        and current_soh is not None
    ):

        prediction_error = (
            current_soh
            - predicted_soh
        )

    # --------------------------------------------------------
    # Temperature
    # --------------------------------------------------------

    temperature_max = None

    if "temperature_max" in latest.index:

        value = latest[
            "temperature_max"
        ]

        if not pd.isna(value):

            temperature_max = float(value)

    temperature_mean = None

    if "temperature_mean" in latest.index:

        value = latest[
            "temperature_mean"
        ]

        if not pd.isna(value):

            temperature_mean = float(value)

    # --------------------------------------------------------
    # Cycle
    # --------------------------------------------------------

    cycle = None

    if "cycle" in latest.index:

        if not pd.isna(
            latest["cycle"]
        ):

            cycle = int(
                latest["cycle"]
            )

    # --------------------------------------------------------
    # Maintenance risk
    # --------------------------------------------------------

    result = calculate_maintenance_risk(

        current_soh=current_soh,

        degradation=degradation,

        predicted_soh=predicted_soh,

        prediction_error=prediction_error,

        temperature_max=temperature_max,

        temperature_mean=temperature_mean,

        cycle=cycle
    )

    # --------------------------------------------------------
    # Priority score
    # --------------------------------------------------------

    priority_score = calculate_priority_score(

        risk_score=
            result["risk_score"],

        current_soh=
            current_soh,

        degradation=
            degradation
    )

    # --------------------------------------------------------
    # Final response
    # --------------------------------------------------------

    result["battery_id"] = battery_id

    result["cycle"] = cycle

    result["priority_score"] = (
        priority_score
    )

    result["prediction_error_percent"] = (

        round(
            prediction_error,
            2
        )

        if prediction_error is not None

        else None
    )

    result["temperature_max"] = (

        round(
            temperature_max,
            2
        )

        if temperature_max is not None

        else None
    )

    result["temperature_mean"] = (

        round(
            temperature_mean,
            2
        )

        if temperature_mean is not None

        else None
    )

    return result

# ============================================================
# NEARBY EV CHARGING STATIONS
# ============================================================

@app.get("/charging-stations")
def get_charging_stations(
    lat: float,
    lon: float,
    radius: int = 5000
):
    """
    Return nearby EV charging stations from OpenStreetMap
    through the Overpass API.

    lat/lon are the search center in decimal degrees.
    radius is in metres.
    """

    if not (-90 <= lat <= 90):
        raise HTTPException(
            status_code=400,
            detail="Invalid latitude."
        )

    if not (-180 <= lon <= 180):
        raise HTTPException(
            status_code=400,
            detail="Invalid longitude."
        )

    radius = max(500, min(int(radius), 25000))

    query = f"""
[out:json][timeout:25];
(
  nwr["amenity"="charging_station"](around:{radius},{lat},{lon});
);
out center tags;
"""

    try:
        encoded = urllib.parse.urlencode({"data": query}).encode("utf-8")

        request = urllib.request.Request(
            "https://overpass-api.de/api/interpreter",
            data=encoded,
            headers={
                "User-Agent": "EV-Battery-Intelligence/1.0"
            },
            method="POST"
        )

        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(
                response.read().decode("utf-8")
            )

    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=(
                "Unable to retrieve charging stations "
                f"from OpenStreetMap: {e}"
            )
        )

    def haversine_km(
        lat1,
        lon1,
        lat2,
        lon2
    ):
        earth_radius_km = 6371.0088

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)

        dphi = math.radians(
            lat2 - lat1
        )

        dlambda = math.radians(
            lon2 - lon1
        )

        a = (
            math.sin(dphi / 2) ** 2
            + math.cos(phi1)
            * math.cos(phi2)
            * math.sin(dlambda / 2) ** 2
        )

        return (
            2
            * earth_radius_km
            * math.asin(
                math.sqrt(a)
            )
        )

    stations = []

    for element in payload.get("elements", []):
        tags = element.get("tags", {})

        if "lat" in element and "lon" in element:
            station_lat = element["lat"]
            station_lon = element["lon"]

        elif element.get("center"):
            station_lat = element["center"].get("lat")
            station_lon = element["center"].get("lon")

        else:
            continue

        if station_lat is None or station_lon is None:
            continue

        try:
            station_lat = float(station_lat)
            station_lon = float(station_lon)
        except (TypeError, ValueError):
            continue

        distance = haversine_km(
            lat,
            lon,
            station_lat,
            station_lon
        )

        station_id = (
            f"{element.get('type', 'station')}-"
            f"{element.get('id', 'unknown')}"
        )

        name = (
            tags.get("name")
            or tags.get("operator")
            or "EV Charging Station"
        )

        stations.append({
            "id": station_id,
            "name": name,
            "latitude": station_lat,
            "longitude": station_lon,
            "distance_km": round(distance, 2),
            "brand": tags.get("brand"),
            "operator": tags.get("operator"),
            "output_kw": (
                tags.get("capacity:output")
                or tags.get("output:charging")
                or tags.get("charging_station:output")
            ),
            "capacity": tags.get("capacity"),
            "opening_hours": tags.get("opening_hours")
        })

    stations.sort(
        key=lambda station: station["distance_km"]
    )

    return {
        "latitude": lat,
        "longitude": lon,
        "radius_m": radius,
        "count": len(stations),
        "stations": stations[:50]
    }


# ============================================================
# MANUAL SOH PREDICTION
# ============================================================

@app.post("/predict")
def predict_soh(
    data: dict
):

    try:

        if not FEATURE_NAMES:

            raise HTTPException(

                status_code=500,

                detail=
                    "Model feature names are unavailable."
            )

        missing_features = [

            feature

            for feature in FEATURE_NAMES

            if feature not in data
        ]

        if missing_features:

            raise HTTPException(

                status_code=400,

                detail={

                    "message":
                        "Missing required features.",

                    "missing_features":
                        missing_features
                }
            )

        values = []

        for feature in FEATURE_NAMES:

            try:

                value = float(
                    data[feature]
                )

            except (
                TypeError,
                ValueError
            ):

                raise HTTPException(

                    status_code=400,

                    detail={

                        "message":
                            "Invalid numeric value.",

                        "feature":
                            feature,

                        "value":
                            data[feature]
                    }
                )

            values.append(
                value
            )

        input_data = pd.DataFrame(

            [values],

            columns=FEATURE_NAMES
        )

        scaled_array = scaler.transform(
            input_data
        )

        # Keep feature names after scaling so the model
        # receives the same named columns used during training.
        scaled_data = pd.DataFrame(
            scaled_array,
            columns=FEATURE_NAMES,
            index=input_data.index
        )

        prediction = model.predict(
            scaled_data
        )

        soh = float(
            prediction[0]
        )

        soh = max(

            0.0,

            min(
                100.0,
                soh
            )
        )

        return {

            "predicted_soh_percent":
                round(
                    soh,
                    2
                ),

            "model":
                type(model).__name__
        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(

            status_code=500,

            detail=str(e)
        )
    