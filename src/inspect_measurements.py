import scipy.io
import numpy as np
from pathlib import Path

# --------------------------------------------------
# Load NASA battery data
# --------------------------------------------------

file_path = Path("data/raw/B0005.mat")

battery_data = scipy.io.loadmat(file_path)

battery = battery_data["B0005"]

cycles = battery["cycle"][0, 0]

print("=" * 60)
print("NASA BATTERY MEASUREMENT INSPECTION")
print("=" * 60)

# --------------------------------------------------
# Find first discharge cycle
# --------------------------------------------------

discharge_cycle = None

for i in range(cycles.shape[1]):

    cycle = cycles[0, i]

    cycle_type = cycle["type"][0]

    if hasattr(cycle_type, "item"):
        cycle_type = cycle_type.item()

    if cycle_type == "discharge":

        discharge_cycle = cycle

        print("\nFirst discharge cycle found:")
        print(f"Cycle number: {i + 1}")

        break


# --------------------------------------------------
# Extract discharge measurements
# --------------------------------------------------

data = discharge_cycle["data"]

print("\nMeasurement fields:")
print(data.dtype.names)

# --------------------------------------------------
# Extract individual measurements
# --------------------------------------------------

voltage = data["Voltage_measured"][0, 0]
current = data["Current_measured"][0, 0]
temperature = data["Temperature_measured"][0, 0]
current_load = data["Current_load"][0, 0]
voltage_load = data["Voltage_load"][0, 0]
time = data["Time"][0, 0]

# --------------------------------------------------
# Print shapes
# --------------------------------------------------

print("\nMeasurement shapes:")

print("Voltage:", voltage.shape)
print("Current:", current.shape)
print("Temperature:", temperature.shape)
print("Current load:", current_load.shape)
print("Voltage load:", voltage_load.shape)
print("Time:", time.shape)

# --------------------------------------------------
# Flatten measurements
# --------------------------------------------------

voltage = np.asarray(voltage).flatten()
current = np.asarray(current).flatten()
temperature = np.asarray(temperature).flatten()
current_load = np.asarray(current_load).flatten()
voltage_load = np.asarray(voltage_load).flatten()
time = np.asarray(time).flatten()

# --------------------------------------------------
# Print number of measurements
# --------------------------------------------------

print("\nNumber of measurements:")
print("Voltage:", len(voltage))
print("Current:", len(current))
print("Temperature:", len(temperature))
print("Current load:", len(current_load))
print("Voltage load:", len(voltage_load))
print("Time:", len(time))

# --------------------------------------------------
# Print first 10 values
# --------------------------------------------------

print("\nFirst 10 voltage values:")
print(voltage[:10])

print("\nFirst 10 current values:")
print(current[:10])

print("\nFirst 10 temperature values:")
print(temperature[:10])

print("\nFirst 10 time values:")
print(time[:10])

# --------------------------------------------------
# Basic statistics
# --------------------------------------------------

print("\nMeasurement statistics:")
print("-" * 60)

print(
    f"Voltage     : min={voltage.min():.4f}, "
    f"max={voltage.max():.4f}, "
    f"mean={voltage.mean():.4f}"
)

print(
    f"Current     : min={current.min():.4f}, "
    f"max={current.max():.4f}, "
    f"mean={current.mean():.4f}"
)

print(
    f"Temperature : min={temperature.min():.4f}, "
    f"max={temperature.max():.4f}, "
    f"mean={temperature.mean():.4f}"
)

print(
    f"Current load: min={current_load.min():.4f}, "
    f"max={current_load.max():.4f}, "
    f"mean={current_load.mean():.4f}"
)

print(
    f"Voltage load: min={voltage_load.min():.4f}, "
    f"max={voltage_load.max():.4f}, "
    f"mean={voltage_load.mean():.4f}"
)

print(
    f"Time        : min={time.min():.4f}, "
    f"max={time.max():.4f}"
)

print("\n" + "=" * 60)
print("MEASUREMENT INSPECTION COMPLETE")
print("=" * 60)
print("\nVoltage diagnostic:")
print("-" * 60)

print("Number of voltage measurements:", len(voltage))

print("\nFirst 20 voltage values:")
print(voltage[:20])

print("\nLast 20 voltage values:")
print(voltage[-20:])

print("\nNegative voltage count:")
print(np.sum(voltage < 0))

print("\nZero voltage count:")
print(np.sum(voltage == 0))

print("\nVoltage values below 1V:")
print(voltage[voltage < 1][:20])
print("\nFINAL VOLTAGE CONSISTENCY CHECK")
print("-" * 60)

print("Voltage minimum:", voltage.min())
print("Voltage maximum:", voltage.max())
print("Negative values:", np.sum(voltage < 0))
print("Values below 1V:", np.sum(voltage < 1))

if voltage.min() < 0:
    print("WARNING: Negative voltage detected!")
else:
    print("Voltage check PASSED")