import sqlite3
from pathlib import Path

import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parents[2]

DATABASE_PATH = (
    BASE_DIR
    / "data"
    / "vehicles.db"
)

CSV_PATH = (
    BASE_DIR
    / "data"
    / "processed"
    / "battery_ml_degradation_features.csv"
)


# ============================================================
# DATABASE CONNECTION
# ============================================================

def get_connection():

    DATABASE_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    conn = sqlite3.connect(
        DATABASE_PATH
    )

    return conn


# ============================================================
# SAFE COLUMN NAME
# ============================================================

def quote_column(column):

    column = str(column).strip()

    return '"' + column.replace('"', '""') + '"'


# ============================================================
# GET EXISTING DATABASE COLUMNS
# ============================================================

def get_existing_columns(conn):

    rows = conn.execute(
        "PRAGMA table_info(battery_records)"
    ).fetchall()

    return {
        row[1]
        for row in rows
    }


# ============================================================
# ADD MISSING COLUMNS
# ============================================================

def add_missing_columns(
    conn,
    columns
):

    existing_columns = get_existing_columns(
        conn
    )

    for column in columns:

        column = str(column).strip()

        if not column:
            continue

        if column in existing_columns:
            continue

        if column == "id":
            continue

        conn.execute(
            f"""
            ALTER TABLE battery_records
            ADD COLUMN {quote_column(column)} REAL
            """
        )

        existing_columns.add(
            column
        )


# ============================================================
# CREATE DATABASE TABLE
# ============================================================

def initialize_database(
    feature_names
):

    conn = get_connection()

    columns = [
        "battery_id TEXT NOT NULL",
        "cycle REAL NOT NULL"
    ]

    for feature in feature_names:

        feature = str(feature).strip()

        if feature in [
            "battery_id",
            "cycle",
            "id"
        ]:
            continue

        columns.append(
            f"{quote_column(feature)} REAL"
        )

    # SOH
    if "SOH_percent" not in feature_names:

        columns.append(
            '"SOH_percent" REAL'
        )

    # SOH change is useful for degradation analysis
    if "SOH_change" not in feature_names:

        columns.append(
            '"SOH_change" REAL'
        )

    column_sql = ", ".join(
        columns
    )

    conn.execute(
        f"""
        CREATE TABLE IF NOT EXISTS battery_records (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            {column_sql},

            UNIQUE(
                battery_id,
                cycle
            )
        )
        """
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # Migrate an existing database if columns are missing.
    # --------------------------------------------------------

    required_columns = list(
        feature_names
    )

    required_columns.extend(
        [
            "SOH_percent",
            "SOH_change"
        ]
    )

    add_missing_columns(
        conn,
        required_columns
    )

    conn.commit()
    conn.close()


# ============================================================
# IMPORT EXISTING DATASET
# ============================================================

def import_existing_dataset(
    feature_names
):

    if not CSV_PATH.exists():
        return

    conn = get_connection()

    # --------------------------------------------------------
    # Make sure the table exists
    # --------------------------------------------------------

    table_exists = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        AND name='battery_records'
        """
    ).fetchone()

    if not table_exists:

        conn.close()

        initialize_database(
            feature_names
        )

        conn = get_connection()

    # --------------------------------------------------------
    # Read CSV
    # --------------------------------------------------------

    df = pd.read_csv(
        CSV_PATH
    )

    if df.empty:

        conn.close()
        return

    # --------------------------------------------------------
    # Required columns
    # --------------------------------------------------------

    if "battery_id" not in df.columns:

        conn.close()
        return

    if "cycle" not in df.columns:

        conn.close()
        return

    # --------------------------------------------------------
    # Normalize battery ID
    # --------------------------------------------------------

    df["battery_id"] = (
        df["battery_id"]
        .astype(str)
        .str.strip()
        .str.upper()
    )

    # --------------------------------------------------------
    # Normalize cycle
    # --------------------------------------------------------

    df["cycle"] = pd.to_numeric(
        df["cycle"],
        errors="coerce"
    )

    df = df.dropna(
        subset=[
            "battery_id",
            "cycle"
        ]
    )

    # --------------------------------------------------------
    # IMPORTANT:
    # Add ALL CSV columns to database automatically.
    #
    # This fixes the SOH_change problem and also means
    # future features can be added without changing
    # the database manually.
    # --------------------------------------------------------

    add_missing_columns(
        conn,
        df.columns
    )

    # --------------------------------------------------------
    # Check whether database already contains records
    # --------------------------------------------------------

    existing = pd.read_sql_query(
        """
        SELECT COUNT(*) AS count
        FROM battery_records
        """,
        conn
    )

    existing_count = int(
        existing.iloc[0]["count"]
    )

    # --------------------------------------------------------
    # If database already has records, still commit any
    # newly added columns.
    # --------------------------------------------------------

    if existing_count > 0:

        conn.commit()
        conn.close()

        return

    # --------------------------------------------------------
    # Insert dataset
    # --------------------------------------------------------

    columns = list(
        df.columns
    )

    column_names = ",".join(
        quote_column(column)
        for column in columns
    )

    placeholders = ",".join(
        ["?"] * len(columns)
    )

    sql = f"""
        INSERT OR IGNORE INTO battery_records
        ({column_names})
        VALUES ({placeholders})
    """

    records = []

    for _, row in df.iterrows():

        values = []

        for column in columns:

            value = row[column]

            if pd.isna(value):

                values.append(None)

            else:

                # Convert numpy values to normal Python values
                if hasattr(value, "item"):

                    try:
                        value = value.item()
                    except Exception:
                        pass

                values.append(
                    value
                )

        records.append(
            values
        )

    conn.executemany(
        sql,
        records
    )

    conn.commit()
    conn.close()


# ============================================================
# LOAD DATABASE
# ============================================================

def load_database():

    conn = get_connection()

    # --------------------------------------------------------
    # Check table
    # --------------------------------------------------------

    table_exists = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        AND name='battery_records'
        """
    ).fetchone()

    if not table_exists:

        conn.close()

        return pd.DataFrame()

    # --------------------------------------------------------
    # Load all records
    # --------------------------------------------------------

    df = pd.read_sql_query(
        """
        SELECT *
        FROM battery_records
        """,
        conn
    )

    conn.close()

    if df.empty:
        return df

    # --------------------------------------------------------
    # Normalize battery ID
    # --------------------------------------------------------

    if "battery_id" in df.columns:

        df["battery_id"] = (
            df["battery_id"]
            .astype(str)
            .str.strip()
            .str.upper()
        )

    # --------------------------------------------------------
    # Normalize cycle
    # --------------------------------------------------------

    if "cycle" in df.columns:

        df["cycle"] = pd.to_numeric(
            df["cycle"],
            errors="coerce"
        )

        df = df.dropna(
            subset=[
                "battery_id",
                "cycle"
            ]
        )

    return df


# ============================================================
# CHECK VEHICLE
# ============================================================

def vehicle_exists(
    battery_id
):

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    conn = get_connection()

    result = conn.execute(
        """
        SELECT COUNT(*)
        FROM battery_records
        WHERE battery_id = ?
        """,
        (
            battery_id,
        )
    ).fetchone()

    conn.close()

    return result[0] > 0


# ============================================================
# ADD VEHICLE RECORD
# ============================================================

def add_vehicle_record(
    battery_id,
    data
):

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    if not battery_id:

        raise ValueError(
            "Battery ID is required."
        )

    if not isinstance(data, dict):

        raise ValueError(
            "Vehicle data must be a dictionary."
        )

    conn = get_connection()

    # --------------------------------------------------------
    # Check that database table exists
    # --------------------------------------------------------

    table_exists = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
        AND name='battery_records'
        """
    ).fetchone()

    if not table_exists:

        conn.close()

        raise ValueError(
            "Database table has not been initialized."
        )

    # --------------------------------------------------------
    # Automatically add new fields/columns.
    #
    # This means a new vehicle can contain new features
    # without modifying the database code.
    # --------------------------------------------------------

    data_columns = [
        key
        for key in data.keys()
        if key not in [
            "id",
            "battery_id"
        ]
    ]

    add_missing_columns(
        conn,
        data_columns
    )

    # --------------------------------------------------------
    # Build INSERT
    # --------------------------------------------------------

    columns = [
        "battery_id"
    ]

    values = [
        battery_id
    ]

    for key, value in data.items():

        if key in [
            "id",
            "battery_id"
        ]:
            continue

        columns.append(
            key
        )

        # Empty string becomes NULL
        if value == "":

            values.append(
                None
            )

        else:

            # Convert pandas/numpy values
            if hasattr(value, "item"):

                try:
                    value = value.item()
                except Exception:
                    pass

            values.append(
                value
            )

    column_names = ",".join(
        quote_column(column)
        for column in columns
    )

    placeholders = ",".join(
        ["?"] * len(values)
    )

    sql = f"""
        INSERT INTO battery_records
        ({column_names})
        VALUES ({placeholders})
    """

    try:

        conn.execute(
            sql,
            values
        )

        conn.commit()

    except sqlite3.IntegrityError as e:

        conn.rollback()

        raise ValueError(
            str(e)
        )

    finally:

        conn.close()


# ============================================================
# GET VEHICLE RECORDS
# ============================================================

def get_vehicle_records(
    battery_id
):

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    conn = get_connection()

    df = pd.read_sql_query(
        """
        SELECT *
        FROM battery_records
        WHERE battery_id = ?
        ORDER BY cycle
        """,
        conn,
        params=(
            battery_id,
        )
    )

    conn.close()

    return df


# ============================================================
# DELETE VEHICLE
# ============================================================

def delete_vehicle(
    battery_id
):

    battery_id = (
        str(battery_id)
        .strip()
        .upper()
    )

    conn = get_connection()

    cursor = conn.execute(
        """
        DELETE FROM battery_records
        WHERE battery_id = ?
        """,
        (
            battery_id,
        )
    )

    deleted = cursor.rowcount

    conn.commit()
    conn.close()

    return deleted