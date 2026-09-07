import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Google Maps Tile Endpoints
const GOOGLE_TILE_LAYERS = {
  roadmap: {
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    label: "Google Roadmap",
    maxZoom: 20,
  },
  satellite: {
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    label: "Google Satellite",
    maxZoom: 20,
  },
  terrain: {
    url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    label: "Google Terrain",
    maxZoom: 20,
  },
};

function createGoogleVehicleHTML(label, soh) {
  return `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
      <div style="position: absolute; width: 64px; height: 64px; border-radius: 50%; background: rgba(37,99,235,0.22); border: 1.5px solid rgba(59,130,246,0.6); animation: ping 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #1d4ed8, #0284c7); border: 2.5px solid #ffffff; box-shadow: 0 4px 18px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center; font-size: 20px;">
        🚗
      </div>
      <div style="position: absolute; bottom: -24px; padding: 2px 8px; border-radius: 9999px; background: rgba(15,23,42,0.92); border: 1px solid rgba(59,130,246,0.5); color: #93c5fd; font-family: system-ui, sans-serif; font-size: 10px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.4);">
        ${label} ${Number.isFinite(soh) ? `• ${soh.toFixed(0)}%` : ""}
      </div>
    </div>
  `;
}

function createGoogleStationHTML(st, isBest, isSelected) {
  const bg = isSelected ? "#ea580c" : isBest ? "#16a34a" : "#1e293b";
  const border = isSelected ? "2.5px solid #ffffff" : isBest ? "2px solid #ffffff" : "1.5px solid rgba(255,255,255,0.2)";
  const shadow = isSelected
    ? "0 0 22px rgba(234,88,12,0.9)"
    : isBest
    ? "0 0 16px rgba(22,163,74,0.7)"
    : "0 3px 10px rgba(0,0,0,0.5)";

  const pwr = st._output?.includes("250")
    ? "250kW"
    : st._output?.includes("180")
    ? "180kW"
    : st._output?.includes("150")
    ? "150kW"
    : st._output?.includes("120")
    ? "120kW"
    : "Fast DC";

  return `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
      ${
        isBest
          ? `<div style="position: absolute; top: -25px; padding: 2px 8px; border-radius: 9999px; background: #16a34a; color: #ffffff; font-family: system-ui, sans-serif; font-size: 9px; font-weight: 800; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid #ffffff;">★ BEST OPTION</div>`
          : ""
      }
      <div style="width: 38px; height: 38px; border-radius: 12px; background: ${bg}; border: ${border}; box-shadow: ${shadow}; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #ffffff;">
        ⚡
      </div>
      <div style="position: absolute; bottom: -20px; padding: 1px 6px; border-radius: 4px; background: rgba(15,23,42,0.92); border: 1px solid rgba(255,255,255,0.15); color: #f1f5f9; font-family: monospace; font-size: 9px; font-weight: 700; white-space: nowrap;">
        ${pwr}
      </div>
    </div>
  `;
}

export function GoogleMapComponent({
  center,
  stations = [],
  selectedStation,
  onSelectStation,
  activeVehicle,
  currentSOH,
  triggerCenter,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const rangeCirclesRef = useRef([]);
  const stationMarkersRef = useRef([]);
  const [mapType, setMapType] = useState("roadmap"); // roadmap, satellite, terrain

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || !center) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Initial Tile Layer
    const layerConfig = GOOGLE_TILE_LAYERS[mapType];
    const tileLayer = L.tileLayer(layerConfig.url, {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapRef.current = map;

    // Vehicle Marker
    const vehicleIcon = L.divIcon({
      html: createGoogleVehicleHTML(activeVehicle || "EV-FLEET", currentSOH),
      className: "google-vehicle-marker",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const vMarker = L.marker([center.lat, center.lng], {
      icon: vehicleIcon,
      zIndexOffset: 1000,
    }).addTo(map);

    vMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 190px; color: #0f172a;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">
            Google Maps Fleet Tracking
          </span>
        </div>
        <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">
          🚗 ${activeVehicle || "Active EV"}
        </div>
        ${
          Number.isFinite(currentSOH)
            ? `<div style="font-size: 12px; margin-top: 4px; color: #059669; font-weight: 700;">Battery SOH: ${currentSOH.toFixed(1)}% (Nominal)</div>`
            : ""
        }
        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
          GPS Coordinates: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}
        </div>
      </div>
    `);

    vehicleMarkerRef.current = vMarker;

    // Range Radiuses (5km safe range & 12km max range)
    const safeCircle = L.circle([center.lat, center.lng], {
      radius: 5000,
      color: "#2563eb",
      weight: 1.5,
      dashArray: "4, 6",
      fillColor: "#3b82f6",
      fillOpacity: 0.05,
    }).addTo(map);

    const maxCircle = L.circle([center.lat, center.lng], {
      radius: 12000,
      color: "#0284c7",
      weight: 1,
      dashArray: "2, 8",
      fillColor: "#0284c7",
      fillOpacity: 0.02,
    }).addTo(map);

    rangeCirclesRef.current = [safeCircle, maxCircle];

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center]);

  // Switch Google Map Type (Roadmap / Satellite / Terrain)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerConfig = GOOGLE_TILE_LAYERS[mapType];
    const newLayer = L.tileLayer(layerConfig.url, {
      subdomains: ["0", "1", "2", "3"],
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Update Vehicle Marker Position & Range circles
  useEffect(() => {
    if (!center) return;
    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([center.lat, center.lng]);
    }
    rangeCirclesRef.current.forEach((circle) => {
      circle.setLatLng([center.lat, center.lng]);
    });
  }, [center]);

  // Re-center on vehicle
  useEffect(() => {
    if (!mapRef.current || !center || triggerCenter === 0) return;
    mapRef.current.setView([center.lat, center.lng], 14, { animate: true });
  }, [triggerCenter, center]);

  // Render Charging Station Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous markers
    stationMarkersRef.current.forEach((m) => map.removeLayer(m));
    stationMarkersRef.current = [];

    stations.forEach((st, idx) => {
      if (!Number.isFinite(st._lat) || !Number.isFinite(st._lng)) return;
      const isBest = idx === 0;
      const isSelected = selectedStation?._id === st._id;

      const icon = L.divIcon({
        html: createGoogleStationHTML(st, isBest, isSelected),
        className: "google-station-marker",
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      const marker = L.marker([st._lat, st._lng], {
        icon,
        zIndexOffset: isSelected ? 900 : isBest ? 800 : 400,
      }).addTo(map);

      // Popup with Google Maps navigation link
      const navUrl =
        st._mapsUri ||
        `https://www.google.com/maps/dir/?api=1&destination=${st._lat},${st._lng}`;

      const popupContent = `
        <div style="font-family: system-ui, sans-serif; padding: 6px; min-width: 220px; color: #0f172a;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <span style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">
              ${st._output || "Fast DC"}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #15803d;">
              📍 ${st._distance?.toFixed(2)} km
            </span>
          </div>
          <h4 style="font-size: 13px; font-weight: 700; margin: 6px 0 2px; color: #0f172a; line-height: 1.3;">
            ${st._name}
          </h4>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 6px; line-height: 1.3;">
            ${st._address || "Address unavailable"}
          </p>
          ${
            st._rating
              ? `<div style="font-size: 11px; color: #d97706; font-weight: 700; margin-bottom: 8px;">
                  ★ ${st._rating} (${st._ratingCount || 100}+ reviews)
                </div>`
              : ""
          }
          <a href="${navUrl}" target="_blank" rel="noreferrer"
             style="display: block; text-align: center; background: #2563eb; color: #ffffff; padding: 7px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; text-decoration: none; box-shadow: 0 2px 8px rgba(37,99,235,0.4);">
            Navigate via Google Maps ↗
          </a>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        if (typeof onSelectStation === "function") {
          onSelectStation(st);
        }
      });

      stationMarkersRef.current.push(marker);
    });
  }, [stations, selectedStation, onSelectStation]);

  // Pan to selected station
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedStation || !Number.isFinite(selectedStation._lat)) return;
    map.setView([selectedStation._lat, selectedStation._lng], 15, {
      animate: true,
    });
  }, [selectedStation]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Google Maps Layer Switcher (Top Left) */}
      <div className="absolute top-4 left-4 z-[400] flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-white/15 shadow-xl">
        <button
          onClick={() => setMapType("roadmap")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mapType === "roadmap"
              ? "bg-blue-600 text-white shadow-md font-bold"
              : "text-slate-300 hover:text-white"
          }`}
        >
          Roadmap
        </button>
        <button
          onClick={() => setMapType("satellite")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mapType === "satellite"
              ? "bg-blue-600 text-white shadow-md font-bold"
              : "text-slate-300 hover:text-white"
          }`}
        >
          Satellite Hybrid
        </button>
        <button
          onClick={() => setMapType("terrain")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mapType === "terrain"
              ? "bg-blue-600 text-white shadow-md font-bold"
              : "text-slate-300 hover:text-white"
          }`}
        >
          Terrain
        </button>
      </div>

      {/* Google Attribution Badge (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 backdrop-blur-md border border-white/10 text-[11px] text-slate-300 shadow-lg pointer-events-none">
        <span className="font-bold text-white tracking-wide">Google Maps</span>
        <span className="text-slate-500">•</span>
        <span className="text-slate-400">Live EV Fleet Routing</span>
      </div>
    </div>
  );
}
