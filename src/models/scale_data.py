import pandas as pd
from pathlib import Path
from sklearn.preprocessing import StandardScaler
import joblib


# ============================================================
# PATHS
# ============================================================

DATA_FOLDER = Path("data/processed")

TRAIN_FILE = DATA_FOLDER / "X_train.csv"
TEST_FILE = DATA_FOLDER / "X_test.csv"

TRAIN_SCALED_FILE = DATA_FOLDER / "X_train_scaled.csv"
TEST_SCALED_FILE = DATA_FOLDER / "X_test_scaled.csv"

SCALER_FILE = DATA_FOLDER / "scaler.pkl"


# ============================================================
# LOAD DATA
# ============================================================

X_train = pd.read_csv(TRAIN_FILE)
X_test = pd.read_csv(TEST_FILE)

print("=" * 60)
print("FEATURE SCALING")
print("=" * 60)

print("\nTraining data shape:")
print(X_train.shape)

print("\nTesting data shape:")
print(X_test.shape)


# ============================================================
# CHECK FEATURE CONSISTENCY
# ============================================================

if list(X_train.columns) != list(X_test.columns):
    raise ValueError(
        "Training and testing features do not match."
    )

FEATURE_NAMES = X_train.columns.tolist()

print("\nNumber of features:")
print(len(FEATURE_NAMES))

print("\nFeatures:")
for feature in FEATURE_NAMES:
    print("-", feature)


# ============================================================
# CHECK NUMERIC FEATURES
# ============================================================

non_numeric = X_train.select_dtypes(
    exclude=["number"]
).columns.tolist()

if non_numeric:
    raise ValueError(
        "Non-numeric features found:\n"
        + "\n".join(non_numeric)
    )


# ============================================================
# CHECK FOR MISSING VALUES
# ============================================================

if X_train.isnull().sum().sum() > 0:
    raise ValueError(
        "Missing values found in training data."
    )

if X_test.isnull().sum().sum() > 0:
    raise ValueError(
        "Missing values found in testing data."
    )


# ============================================================
# CREATE SCALER
# ============================================================

scaler = StandardScaler()


# ============================================================
# FIT ONLY ON TRAINING DATA
# ============================================================

X_train_scaled_array = scaler.fit_transform(
    X_train
)


# ============================================================
# TRANSFORM TEST DATA
# ============================================================

X_test_scaled_array = scaler.transform(
    X_test
)


# ============================================================
# CONVERT BACK TO DATAFRAMES
# ============================================================

X_train_scaled = pd.DataFrame(
    X_train_scaled_array,
    columns=FEATURE_NAMES
)

X_test_scaled = pd.DataFrame(
    X_test_scaled_array,
    columns=FEATURE_NAMES
)


# ============================================================
# SAVE SCALED DATA
# ============================================================

X_train_scaled.to_csv(
    TRAIN_SCALED_FILE,
    index=False
)

X_test_scaled.to_csv(
    TEST_SCALED_FILE,
    index=False
)


# ============================================================
# SAVE SCALER
# ============================================================

joblib.dump(
    scaler,
    SCALER_FILE
)


# ============================================================
# VERIFY SCALER
# ============================================================

print("\nScaler feature names:")

print(
    scaler.feature_names_in_.tolist()
)


# ============================================================
# DISPLAY RESULTS
# ============================================================

print("\nScaled training data:")
print(X_train_scaled.head())

print("\nScaled testing data:")
print(X_test_scaled.head())


# ============================================================
# FILE INFORMATION
# ============================================================

print("\nSaved files:")

print(
    "Training:",
    TRAIN_SCALED_FILE
)

print(
    "Testing :",
    TEST_SCALED_FILE
)

print(
    "Scaler  :",
    SCALER_FILE
)


# ============================================================
# COMPLETE
# ============================================================

print("\n" + "=" * 60)
print("FEATURE SCALING COMPLETE")
print("=" * 60)

print("\nIMPORTANT:")
print("Scaler was fitted ONLY on training data.")
print("Test data was transformed using the training scaler.")
print("No test-data information was used during fitting.")
