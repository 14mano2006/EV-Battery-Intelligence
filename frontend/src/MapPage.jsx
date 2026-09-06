import React, { useEffect, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

const SEARCH_RADIUS_KM = 20;
const DEFAULT_LOCATION = { lat: 12.9716, lng: 77.5946 };

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let mapsLoaderConfigured = false;

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getPlaceName(place) {
  if (typeof place?.displayName === "string") {
    return place.displayName;
  }

  return (
    place?.displayName?.text ||
    place?.name ||
    "EV Charging Station"
  );
}

function getPlaceLocation(place) {
  const location = place?.location;

  if (!location) return null;

  const lat =
    typeof location.lat === "function"
      ? location.lat()
      : location.lat;

  const lng =
    typeof location.lng === "function"
      ? location.lng()
      : location.lng;

  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
    return null;
  }

  return {
    lat: Number(lat),
    lng: Number(lng),
  };
}

function vehicleLabel(selectedVehicle, battery) {
  if (typeof selectedVehicle === "string") return selectedVehicle;

  return (
    selectedVehicle?.vehicle_id ||
    selectedVehicle?.battery_id ||
    battery?.vehicle_id ||
    battery?.battery_id ||
    "Current Vehicle"
  );
}

function createVehicleMarker() {
  const element = document.createElement("div");

  element.innerHTML = `
    <div style="
      width:44px;
      height:44px;
      border-radius:50%;
      background:#2563eb;
      border:4px solid #fff;
      box-shadow:0 4px 14px rgba(0,0,0,.28);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:21px;
    ">🚗</div>
  `;

  return element;
}

function createStationMarker(recommended) {
  const element = document.createElement("div");

  element.innerHTML = `
    <div style="
      position:relative;
      width:${recommended ? 44 : 38}px;
      height:${recommended ? 44 : 38}px;
      border-radius:50%;
      background:${recommended ? "#16a34a" : "#0f766e"};
      border:4px solid #fff;
      box-shadow:0 4px 14px rgba(0,0,0,.25);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:${recommended ? 21 : 18}px;
    ">
      ⚡
      ${
        recommended
          ? `<span style="
              position:absolute;
              bottom:45px;
              left:50%;
              transform:translateX(-50%);
              background:#111827;
              color:#fff;
              padding:5px 9px;
              border-radius:8px;
              font:700 11px Arial,sans-serif;
              white-space:nowrap;
            ">Recommended</span>`
          : ""
      }
    </div>
  `;

  return element;
}

export default function MapPage({ battery, selectedVehicle }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const stationMarkersRef = useRef([]);
  const infoWindowRef = useRef(null);

  const [location, setLocation] = useState(null);
  const [locationState, setLocationState] = useState(
    "Detecting location..."
  );
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loadingStations, setLoadingStations] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [stationError, setStationError] = useState("");

  const currentSOH = Number(
    battery?.SOH_percent ??
      battery?.soh_percent ??
      battery?.current_soh_percent
  );

  const healthLabel = Number.isFinite(currentSOH)
    ? currentSOH >= 80
      ? "Healthy"
      : currentSOH >= 60
        ? "Good"
        : currentSOH >= 40
          ? "Needs Attention"
          : "Critical"
    : "Health unavailable";

  const activeVehicle = vehicleLabel(selectedVehicle, battery);

  const loadGoogleLibraries = async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error(
        "Google Maps API key is missing. Check frontend/.env."
      );
    }

    if (!mapsLoaderConfigured) {
      setOptions({
        key: GOOGLE_MAPS_API_KEY,
        v: "weekly",
      });

      mapsLoaderConfigured = true;
    }

    const [{ Map, InfoWindow }, { AdvancedMarkerElement }, { Place }] =
      await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
        importLibrary("places"),
      ]);

    return {
      Map,
      InfoWindow,
      AdvancedMarkerElement,
      Place,
    };
  };

  const fetchGooglePlaces = async (lat, lng) => {
    try {
      setLoadingStations(true);
      setStationError("");

      const { Place } = await loadGoogleLibraries();

      const request = {
        fields: [
          "displayName",
          "location",
          "formattedAddress",
          "googleMapsURI",
        ],
        locationRestriction: {
          center: { lat, lng },
          radius: SEARCH_RADIUS_KM * 1000,
        },
        includedPrimaryTypes: [
          "electric_vehicle_charging_station",
        ],
        maxResultCount: 20,
        rankPreference: "DISTANCE",
      };

      const response = await Place.searchNearby(request);
      const places = Array.isArray(response?.places)
        ? response.places
        : [];

      const prepared = places
        .map((place, index) => {
          const coords = getPlaceLocation(place);

          if (!coords) return null;

          return {
            _id: place.id || `google-place-${index}`,
            _name: getPlaceName(place),
            _address:
              place.formattedAddress ||
              "Address unavailable",
            _lat: coords.lat,
            _lng: coords.lng,
            _distance: getDistanceKm(
              lat,
              lng,
              coords.lat,
              coords.lng
            ),
            _mapsUri: place.googleMapsURI || "",
            _source: "Google Places",
          };
        })
        .filter(Boolean)
        .sort((a, b) => a._distance - b._distance);

      setStations(prepared);
      setSelectedStation(prepared[0] || null);
    } catch (error) {
      console.error("Google Places charging station error:", error);

      setStations([]);
      setSelectedStation(null);

      const message =
        error?.message ||
        "Google Places could not find charging stations.";

      setStationError(
        `${message} Make sure Places API (New) is enabled and billing is active for the Google Cloud project.`
      );
    } finally {
      setLoadingStations(false);
    }
  };

  const initializeMap = async (initialLocation) => {
    try {
      setMapError("");

      const {
        Map,
        InfoWindow,
        AdvancedMarkerElement,
      } = await loadGoogleLibraries();

      const map = new Map(mapContainerRef.current, {
        center: initialLocation,
        zoom: 13,
        mapId: "DEMO_MAP_ID",
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: "greedy",
      });

      mapRef.current = map;
      infoWindowRef.current = new InfoWindow();

      const vehicleMarker = new AdvancedMarkerElement({
        map,
        position: initialLocation,
        title: "Current vehicle location",
        content: createVehicleMarker(),
        zIndex: 1000,
        gmpClickable: true,
      });

      vehicleMarker.addEventListener("gmp-click", () => {
        const content = `
          <div style="
            padding:4px;
            min-width:180px;
            font-family:Arial,sans-serif;
          ">
            <strong style="font-size:15px">
              ${activeVehicle}
            </strong>

            <div style="
              margin-top:5px;
              color:#6b7280;
              font-size:12px;
            ">
              ${
                Number.isFinite(currentSOH)
                  ? `Battery SOH: ${currentSOH.toFixed(1)}%`
                  : "Battery SOH unavailable"
              }
            </div>
          </div>
        `;

        infoWindowRef.current.setContent(content);

        infoWindowRef.current.open({
          map,
          anchor: vehicleMarker,
        });
      });

      vehicleMarkerRef.current = vehicleMarker;
      setMapLoading(false);

      await fetchGooglePlaces(
        initialLocation.lat,
        initialLocation.lng
      );
    } catch (error) {
      console.error("Google Maps error:", error);

      setMapError(
        error?.message ||
          "Google Maps could not load. Check the API key and Maps JavaScript API."
      );

      setMapLoading(false);
    }
  };

  const selectStation = (station) => {
    setSelectedStation(station);

    if (!mapRef.current) return;

    const position = {
      lat: station._lat,
      lng: station._lng,
    };

    mapRef.current.panTo(position);
    mapRef.current.setZoom(16);

    if (infoWindowRef.current) {
      const content = `
        <div style="
          min-width:240px;
          max-width:280px;
          padding:4px;
          font-family:Arial,sans-serif;
        ">
          <strong style="
            font-size:15px;
            color:#111827;
          ">
            ${station._name}
          </strong>

          <div style="
            margin-top:6px;
            color:#6b7280;
            font-size:12px;
            line-height:1.4;
          ">
            ${station._address}
          </div>

          <div style="
            margin-top:8px;
            color:#2563eb;
            font-size:13px;
            font-weight:700;
          ">
            📍 ${station._distance.toFixed(2)} km away
          </div>

          ${
            station._mapsUri
              ? `<a
                  href="${station._mapsUri}"
                  target="_blank"
                  rel="noreferrer"
                  style="
                    display:inline-block;
                    margin-top:10px;
                    padding:8px 11px;
                    border-radius:8px;
                    background:#2563eb;
                    color:#fff;
                    text-decoration:none;
                    font-size:12px;
                    font-weight:700;
                  "
                >
                  Open in Google Maps
                </a>`
              : ""
          }
        </div>
      `;

      infoWindowRef.current.setContent(content);

      infoWindowRef.current.open({
        map: mapRef.current,
        position,
      });
    }
  };

  const centerVehicle = () => {
    if (!mapRef.current || !location) return;

    mapRef.current.panTo(location);
    mapRef.current.setZoom(14);
  };

  const getLocation = () => {
    setMapError("");
    setStationError("");

    if (!navigator.geolocation) {
      setLocation(DEFAULT_LOCATION);
      setLocationState(
        "Location unavailable — showing Bengaluru"
      );

      if (!mapRef.current) {
        initializeMap(DEFAULT_LOCATION);
      }

      return;
    }

    setLocationState("Detecting your location...");

    navigator.geolocation.getCurrentPosition(
      async (result) => {
        const next = {
          lat: result.coords.latitude,
          lng: result.coords.longitude,
        };

        setLocation(next);
        setLocationState("Using your current location");

        if (mapRef.current) {
          mapRef.current.panTo(next);
          mapRef.current.setZoom(14);

          await fetchGooglePlaces(
            next.lat,
            next.lng
          );

          if (vehicleMarkerRef.current) {
            vehicleMarkerRef.current.position = next;
          }
        } else {
          await initializeMap(next);
        }
      },
      async () => {
        setLocation(DEFAULT_LOCATION);

        setLocationState(
          "Location permission unavailable — showing Bengaluru"
        );

        if (!mapRef.current) {
          await initializeMap(DEFAULT_LOCATION);
        } else {
          mapRef.current.panTo(DEFAULT_LOCATION);
          mapRef.current.setZoom(13);

          await fetchGooglePlaces(
            DEFAULT_LOCATION.lat,
            DEFAULT_LOCATION.lng
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  useEffect(() => {
    const start = async () => {
      if (!navigator.geolocation) {
        setLocation(DEFAULT_LOCATION);

        setLocationState(
          "Location unavailable — showing Bengaluru"
        );

        await initializeMap(DEFAULT_LOCATION);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (result) => {
          const next = {
            lat: result.coords.latitude,
            lng: result.coords.longitude,
          };

          setLocation(next);
          setLocationState("Using your current location");

          await initializeMap(next);
        },
        async () => {
          setLocation(DEFAULT_LOCATION);

          setLocationState(
            "Location permission unavailable — showing Bengaluru"
          );

          await initializeMap(DEFAULT_LOCATION);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    };

    start();

    return () => {
      stationMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });

      stationMarkersRef.current = [];

      if (vehicleMarkerRef.current) {
        vehicleMarkerRef.current.map = null;
      }
    };
  }, []);

  useEffect(() => {
    const addMarkers = async () => {
      if (!mapRef.current) return;

      const { AdvancedMarkerElement } =
        await importLibrary("marker");

      stationMarkersRef.current.forEach((marker) => {
        marker.map = null;
      });

      stationMarkersRef.current = [];

      stations.forEach((station, index) => {
        const recommended = index === 0;

        const marker = new AdvancedMarkerElement({
          map: mapRef.current,
          position: {
            lat: station._lat,
            lng: station._lng,
          },
          title: station._name,
          content: createStationMarker(recommended),
          zIndex: recommended ? 900 : 500,
          gmpClickable: true,
        });

        marker.addEventListener("gmp-click", () => {
          selectStation(station);
        });

        stationMarkersRef.current.push(marker);
      });
    };

    addMarkers();
  }, [stations]);

  return (
    <div
      style={{
        width: "100%",
        height: "calc(100vh - 55px)",
        minHeight: "650px",
        display: "flex",
        background: "#eef2f7",
        borderRadius: "18px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        ref={mapContainerRef}
        style={{
          flex: 1,
          minWidth: 0,
          height: "100%",
        }}
      />

      {mapLoading && !mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(248,250,252,.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 38 }}>🗺️</div>

            <strong style={{ color: "#111827" }}>
              Loading Google Maps...
            </strong>
          </div>
        </div>
      )}

      {mapError && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            padding: 30,
          }}
        >
          <div
            style={{
              maxWidth: 520,
              background: "#fff",
              borderRadius: 18,
              padding: 28,
              boxShadow: "0 8px 30px rgba(0,0,0,.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 42 }}>🗺️</div>

            <h2
              style={{
                margin: "10px 0 8px",
                color: "#111827",
              }}
            >
              Google Maps could not load
            </h2>

            <p
              style={{
                color: "#6b7280",
                lineHeight: 1.5,
              }}
            >
              {mapError}
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          zIndex: 10,
          background: "#fff",
          borderRadius: 14,
          padding: "13px 16px",
          boxShadow: "0 4px 18px rgba(0,0,0,.16)",
          minWidth: 220,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            color: "#2563eb",
            letterSpacing: ".7px",
          }}
        >
          ACTIVE VEHICLE
        </div>

        <div
          style={{
            marginTop: 4,
            fontSize: 16,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          🚗 {activeVehicle}
        </div>

        {Number.isFinite(currentSOH) && (
          <div
            style={{
              marginTop: 5,
              fontSize: 12,
              color: "#2563eb",
              fontWeight: 700,
            }}
          >
            Battery SOH {currentSOH.toFixed(1)}% · {healthLabel}
          </div>
        )}
      </div>

      <button
        onClick={centerVehicle}
        title="Center on vehicle"
        style={{
          position: "absolute",
          right: 386,
          bottom: 24,
          zIndex: 10,
          width: 46,
          height: 46,
          border: 0,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 4px 16px rgba(0,0,0,.2)",
          cursor: "pointer",
          fontSize: 19,
        }}
      >
        📍
      </button>

      <aside
        style={{
          width: 360,
          background: "#fff",
          borderLeft: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          zIndex: 20,
        }}
      >
        <div
          style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: "#2563eb",
              letterSpacing: ".6px",
            }}
          >
            EV CHARGING
          </div>

          <h2
            style={{
              margin: "4px 0 0",
              fontSize: 22,
              color: "#111827",
            }}
          >
            Nearby chargers
          </h2>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: 12,
              color: "#6b7280",
            }}
          >
            Google charging stations around your vehicle.
          </p>
        </div>

        <button
          onClick={getLocation}
          style={{
            margin: 16,
            marginBottom: 8,
            border: 0,
            borderRadius: 10,
            padding: "10px 12px",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          📍 Use My Location
        </button>

        <div
          style={{
            padding: "0 20px 12px",
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          Search radius: <strong>{SEARCH_RADIUS_KM} km</strong>
          {" · "}
          {loadingStations
            ? "Searching Google..."
            : `${stations.length} found`}
        </div>

        {stationError && (
          <div
            style={{
              margin: "0 16px 12px",
              padding: 12,
              borderRadius: 12,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            <strong>Charging search unavailable</strong>
            <div style={{ marginTop: 4 }}>
              {stationError}
            </div>
          </div>
        )}

        {selectedStation && (
          <div
            style={{
              margin: "0 16px 14px",
              padding: 15,
              borderRadius: 14,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#15803d",
                letterSpacing: ".5px",
              }}
            >
              ⭐ RECOMMENDED
            </div>

            <div
              style={{
                marginTop: 5,
                fontSize: 14,
                fontWeight: 700,
                color: "#166534",
              }}
            >
              {selectedStation._name}
            </div>

            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: "#4b5563",
              }}
            >
              {selectedStation._distance.toFixed(2)} km away
            </div>

            <button
              onClick={() =>
                selectStation(selectedStation)
              }
              style={{
                width: "100%",
                marginTop: 10,
                border: 0,
                borderRadius: 8,
                padding: 9,
                background: "#16a34a",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              View on Map
            </button>

            {selectedStation._mapsUri && (
              <a
                href={selectedStation._mapsUri}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  marginTop: 8,
                  textAlign: "center",
                  padding: 9,
                  borderRadius: 8,
                  background: "#fff",
                  border: "1px solid #d1d5db",
                  color: "#2563eb",
                  textDecoration: "none",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Open in Google Maps
              </a>
            )}
          </div>
        )}

        <div
          style={{
            padding: "0 16px 10px",
            fontSize: 13,
            fontWeight: 700,
            color: "#374151",
          }}
        >
          Nearby stations
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 16px 18px",
          }}
        >
          {loadingStations && (
            <div
              style={{
                textAlign: "center",
                padding: 30,
                color: "#6b7280",
                fontSize: 13,
              }}
            >
              Finding Google charging stations...
            </div>
          )}

          {!loadingStations &&
            !stationError &&
            stations.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "35px 20px",
                  color: "#6b7280",
                }}
              >
                <div style={{ fontSize: 34 }}>⚡</div>

                <strong style={{ color: "#374151" }}>
                  No stations found
                </strong>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                  }}
                >
                  Google Places found no EV charging
                  stations within {SEARCH_RADIUS_KM} km.
                </div>
              </div>
            )}

          {stations.slice(0, 12).map(
            (station, index) => (
              <div
                key={station._id}
                onClick={() =>
                  selectStation(station)
                }
                style={{
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 12,
                  border:
                    selectedStation?._id ===
                    station._id
                      ? "2px solid #2563eb"
                      : "1px solid #e5e7eb",
                  background:
                    selectedStation?._id ===
                    station._id
                      ? "#eff6ff"
                      : "#fff",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background:
                        index === 0
                          ? "#dcfce7"
                          : "#ccfbf1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    ⚡
                  </div>

                  <div
                    style={{
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#111827",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {station._name}
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: "#6b7280",
                        lineHeight: 1.35,
                      }}
                    >
                      {station._address}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                        color: "#2563eb",
                        fontWeight: 700,
                      }}
                    >
                      📍 {station._distance.toFixed(2)} km
                    </div>

                    {station._mapsUri && (
                      <a
                        href={station._mapsUri}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        style={{
                          display: "inline-block",
                          marginTop: 7,
                          fontSize: 11,
                          color: "#2563eb",
                          textDecoration: "none",
                          fontWeight: 700,
                        }}
                      >
                        Open in Google Maps →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
