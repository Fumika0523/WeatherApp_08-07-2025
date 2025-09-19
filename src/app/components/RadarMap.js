"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function RadarMap({ coords }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // ensure Leaflet only renders on client
  }, []);

  // Prevent rendering if not mounted or coords are missing
  if (!isMounted || !coords || coords.latitude == null || coords.longitude == null) {
    console.log("RadarMap skipped render", { isMounted, coords });
    return null;
  }

  return (
    <div className="w-full border-4 h-64 rounded-xl overflow-hidden">
      <MapContainer
        center={[coords.latitude, coords.longitude]}
        zoom={8}
        scrollWheelZoom={false}
        style={{ width: "100%", height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[coords.latitude, coords.longitude]}>
          <Popup>Current Location</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
