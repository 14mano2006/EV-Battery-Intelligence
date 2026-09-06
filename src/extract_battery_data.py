import scipy.io
import pandas as pd
from pathlib import Path


# --------------------------------------------------
# Configuration
# --------------------------------------------------

DATA_FOLDER = Path("data/raw")

BATTERY_FILES = [
    "B0005.mat",
    "B0006.mat",
    "B0007.mat",
    "B0018.mat"
]


# --------------------------------------------------
# Function to extract discharge cycles
# --------------------------------------------------

def extract_battery(file_name):

    file_path = DATA_FOLDER / file_name

    print(f"\nProcessing {file_name}...")

    # Load MATLAB file
    mat_data = scipy.io.loadmat(file_path)

    # Get battery name
    battery_name = file_name.replace(".mat", "")

    # Get battery structure
    battery = mat_data[battery_name]

    # Get all cycles
    cycles = battery["cycle"][0, 0]

    records = []

    # Process every cycle
    for i in range(cycles.shape[1]):

        cycle = cycles[0, i]

        # Get cycle type
        cycle_type = cycle["type"][0]

        if hasattr(cycle_type, "item"):
            cycle_type = cycle_type.item()

        cycle_type = str(cycle_type)

        # We only want discharge cycles
        if cycle_type.lower() != "discharge":
            continue

        # Get discharge data
        discharge_data = cycle["data"][0, 0]

        # Extract capacity
        capacity = discharge_data["Capacity"]

        # Convert capacity to a single number
        capacity = float(capacity[0, 0])

        # Ambient temperature
        ambient_temperature = float(
            cycle["ambient_temperature"][0, 0]
        )

        # Store record
        records.append({
            "battery_id": battery_name,
            "cycle": i + 1,
            "ambient_temperature": ambient_temperature,
            "capacity_Ah": capacity
        })

    return records


# --------------------------------------------------
# Main program
# --------------------------------------------------

all_records = []

for battery_file in BATTERY_FILES:

    records = extract_battery(battery_file)

    all_records.extend(records)


# Convert to DataFrame
df = pd.DataFrame(all_records)


# --------------------------------------------------
# Calculate SOH
# --------------------------------------------------

df["initial_capacity_Ah"] = (
    df.groupby("battery_id")["capacity_Ah"]
    .transform("first")
)

df["SOH_percent"] = (
    df["capacity_Ah"] /
    df["initial_capacity_Ah"]
) * 100


# --------------------------------------------------
# Display results
# --------------------------------------------------

print("\n" + "=" * 60)
print("BATTERY DATA EXTRACTION COMPLETE")
print("=" * 60)

print("\nNumber of discharge records:")
print(len(df))

print("\nRecords per battery:")
print(df.groupby("battery_id").size())

print("\nFirst records:")
print(df.head(10))

print("\nSOH statistics:")
print(df["SOH_percent"].describe())


# --------------------------------------------------
# Save dataset
# --------------------------------------------------

output_folder = Path("data/processed")

output_folder.mkdir(
    parents=True,
    exist_ok=True
)

output_file = output_folder / "battery_soh_dataset.csv"

df.to_csv(
    output_file,
    index=False
)

print("\nDataset saved to:")
print(output_file)