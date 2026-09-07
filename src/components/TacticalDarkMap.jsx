import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Configure default Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createTacticalVehicleHTML(label) {
  return `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
      <div style="position: absolute; width: 56px; height: 56px; border-radius: 50%; background: rgba(6,182,212,0.25); border: 1px solid rgba(6,182,212,0.5); animation: pulse 2s infinite;"></div>
      <div style="position: relative; width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #0891b2, #2563eb); border: 2.5px solid #ffffff; box-shadow: 0 0 20px rgba(6,182,212,0.7); display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer;">
        🚗
      </div>
      <div style="position: absolute; bottom: -24px; padding: 2px 8px; border-radius: 9999px; background: rgba(15,23,42,0.95); border: 1px solid rgba(6,182,212,0.4); color: #67e8f9; font-family: monospace; font-size: 10px; font-weight: bold; white-space: nowrap;">
        ${label}
      </div>
    </div>
  `;
}

function createTacticalStationHTML(st, isBest, isSelected) {
  const bg = isSelected ? "#f59e0b" : isBest ? "#10b981" : "#0f172a";
  const border = isSelected ? "2.5px solid #ffffff" : isBest ? "2px solid #ffffff" : "1.5px solid rgba(16,185,129,0.5)";
  const glow = isSelected ? "0 0 20px rgba(245,158,11,0.8)" : isBest ? "0 0 15px rgba(16,185,129,0.6)" : "0 4px 12px rgba(0,0,0,0.5)";
  const iconColor = isSelected ? "#0f172a" : isBest ? "#0f172a" : "#34d399";

  return `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%); cursor: pointer;">
      ${
        isBest
          ? `<div style="position: absolute; top: -26px; padding: 2px 7px; border-radius: 9999px; background: #10b981; color: #022c22; font-family: sans-serif; font-size: 9px; font-weight: 900; text-transform: uppercase; white-space: nowrap; box-shadow: 0 2px 8px rgba(16,185,129,0.5); border: 1px solid #ffffff;">★ Best Match</div>`
          : ""
      }
      <div style="width: 38px; height: 38px; border-radius: 12px; background: ${bg}; border: ${border}; box-shadow: ${glow}; display: flex; align-items: center; justify-content: center; font-size: 18px; color: ${iconColor};">
        ⚡
      </div>
      <div style="position: absolute; bottom: -20px; padding: 1px 6px; border-radius: 4px; background: rgba(15,23,42,0.95); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-family: monospace; font-size: 9px; font-weight: bold; white-space: nowrap;">
        ${st._output?.includes("250") ? "250 kW" : st._output?.includes("180") ? "180 kW" : st._output?.includes("120") ? "120 kW" : "Fast DC"}
      </div>
    </div>
  `;
}

export function TacticalDarkMap({
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
  const vehicleMarkerRef = useRef(null);
  const stationMarkersRef = useRef([]);

  // Initialize map once
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
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Clean Dark Vector Base (100% free, no API key required, zero watermarks)
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "&copy; Esri &mdash; OpenStreetMap contributors",
        maxZoom: 16,
      }
    ).addTo(map);

    // Dark Vector Labels & Roads
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "",
        maxZoom: 16,
      }
    ).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update vehicle position
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;

    if (vehicleMarkerRef.current) {
      vehicleMarkerRef.current.setLatLng([center.lat, center.lng]);
    } else {
      const vIcon = L.divIcon({
        className: "tactical-vehicle-marker",
        html: createTacticalVehicleHTML(activeVehicle),
        iconSize: [0, 0],
      });
      const vMarker = L.marker([center.lat, center.lng], {
        icon: vIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      vMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 4px; min-width: 170px;">
          <div style="font-size: 14px; font-weight: 700; color: #0f172a;">🚗 ${activeVehicle}</div>
          <div style="margin-top: 4px; font-size: 12px; color: #0284c7; font-weight: 600;">
            ${Number.isFinite(currentSOH) ? `Battery SOH: ${currentSOH.toFixed(1)}%` : "Vehicle Location"}
          </div>
          <div style="margin-top: 2px; font-size: 10px; color: #64748b;">
            GPS: ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}
          </div>
        </div>
      `);

      vehicleMarkerRef.current = vMarker;
    }
  }, [center, activeVehicle, currentSOH]);

  // Update stations markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    stationMarkersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {}
    });
    stationMarkersRef.current = [];

    const newMarkers = [];
    stations.forEach((st, idx) => {
      const isBest = idx === 0;
      const isSelected = selectedStation?._id === st._id;

      const sIcon = L.divIcon({
        className: `tactical-station-marker-${st._id}`,
        html: createTacticalStationHTML(st, isBest, isSelected),
        iconSize: [0, 0],
      });

      const sMarker = L.marker([st._lat, st._lng], {
        icon: sIcon,
        zIndexOffset: isSelected ? 999 : isBest ? 800 : 400,
      }).addTo(map);

      const popupHtml = `
        <div style="font-family: system-ui, sans-serif; min-width: 210px; max-width: 250px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-weight: 800; background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">
              ${st._output || "Fast DC"}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #15803d;">
              📍 ${st._distance?.toFixed(2)} km
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 6px;">
            ${st._name}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 3px; line-height: 1.35;">
            ${st._address}
          </div>
          ${
            st._mapsUri
              ? `<a href="${st._mapsUri}" target="_blank" rel="noreferrer" style="display:inline-block; margin-top:8px; padding:6px 10px; border-radius:6px; background:#2563eb; color:#ffffff; text-decoration:none; font-size:11px; font-weight:700; text-align:center; width:100%; box-sizing:border-box;">
                  Navigate in Google Maps ↗
                </a>`
              : ""
          }
        </div>
      `;

      sMarker.bindPopup(popupHtml);
      sMarker.on("click", () => {
        onSelectStation(st);
      });

      newMarkers.push(sMarker);
    });

    stationMarkersRef.current = newMarkers;
  }, [stations, selectedStation, onSelectStation]);

  // Center or pan to selected station
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedStation) {
      map.setView([selectedStation._lat, selectedStation._lng], 15, { animate: true });
      const targetMarker = stationMarkersRef.current.find((m) => {
        const p = m.getLatLng();
        return Math.abs(p.lat - selectedStation._lat) < 0.0001 && Math.abs(p.lng - selectedStation._lng) < 0.0001;
      });
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }
  }, [selectedStation]);

  // Center on vehicle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.setView([center.lat, center.lng], 14, { animate: true });
  }, [triggerCenter, center]);

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "100%", borderRadius: "1.25rem" }}
      className="tactical-leaflet-map-canvas"
    />
  );
}
