import scipy.io
from pathlib import Path

# Path to the NASA battery file
file_path = Path("data/raw/B0005.mat")

# Load the MATLAB file
battery_data = scipy.io.loadmat(file_path)

# Get B0005
battery = battery_data["B0005"]

# Get all cycles
cycles = battery["cycle"][0, 0]

print("NASA Battery: B0005")
print("=" * 60)

# Find the first discharge cycle
for i in range(cycles.shape[1]):

    cycle = cycles[0, i]

    cycle_type = cycle["type"][0]

    if hasattr(cycle_type, "item"):
        cycle_type = cycle_type.item()

    cycle_type = str(cycle_type)

    if cycle_type.lower() == "discharge":

        print(f"\nFirst discharge cycle found: Cycle {i + 1}")
        print("-" * 60)

        # Basic cycle information
        print("Cycle type:")
        print(cycle_type)

        print("\nAmbient temperature:")
        print(cycle["ambient_temperature"][0, 0])

        print("\nTime:")
        print(cycle["time"])

        # Get discharge data
        discharge_data = cycle["data"]

        print("\nDischarge data type:")
        print(type(discharge_data))

        print("\nDischarge data shape:")
        print(discharge_data.shape)

        print("\nDischarge data fields:")
        print(discharge_data.dtype.names)

        break