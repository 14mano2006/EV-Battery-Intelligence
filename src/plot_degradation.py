import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# Load processed dataset
file_path = Path("data/processed/battery_soh_dataset.csv")
df = pd.read_csv(file_path)

# Create results folder
results_folder = Path("results")
results_folder.mkdir(exist_ok=True)

# --------------------------------------------------
# GRAPH 1: SOH vs Cycle
# --------------------------------------------------

plt.figure(figsize=(10, 6))

for battery in df["battery_id"].unique():

    battery_data = df[df["battery_id"] == battery]

    plt.plot(
        battery_data["cycle"],
        battery_data["SOH_percent"],
        label=battery
    )

plt.xlabel("Cycle Number")
plt.ylabel("State of Health (SOH %)")
plt.title("Battery SOH Degradation Over Cycles")
plt.legend()
plt.grid(True)

plt.tight_layout()

plt.savefig(
    results_folder / "soh_degradation.png",
    dpi=300
)

plt.show()

# --------------------------------------------------
# GRAPH 2: Capacity vs Cycle
# --------------------------------------------------

plt.figure(figsize=(10, 6))

for battery in df["battery_id"].unique():

    battery_data = df[df["battery_id"] == battery]

    plt.plot(
        battery_data["cycle"],
        battery_data["capacity_Ah"],
        label=battery
    )

plt.xlabel("Cycle Number")
plt.ylabel("Capacity (Ah)")
plt.title("Battery Capacity Degradation Over Cycles")
plt.legend()
plt.grid(True)

plt.tight_layout()

plt.savefig(
    results_folder / "capacity_degradation.png",
    dpi=300
)

plt.show()

# --------------------------------------------------
# GRAPH 3: SOH distribution
# --------------------------------------------------

plt.figure(figsize=(10, 6))

plt.hist(
    df["SOH_percent"],
    bins=20
)

plt.xlabel("State of Health (SOH %)")
plt.ylabel("Number of Records")
plt.title("Distribution of Battery SOH")

plt.grid(True)

plt.tight_layout()

plt.savefig(
    results_folder / "soh_distribution.png",
    dpi=300
)

plt.show()

print("=" * 60)
print("DEGRADATION VISUALIZATION COMPLETE")
print("=" * 60)

print("\nGraphs saved in:")
print(results_folder)