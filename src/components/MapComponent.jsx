import React from "react";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = {
  lat:  -7.28916, // Koordinat pusat
  lng: 112.73439,
};

// Ambil API Key dengan import.meta.env (Khusus Vite)
const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MapComponent = () => {
  console.log("Google Maps API Key:", apiKey); 
  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={10}>
        <Marker position={center} />
      </GoogleMap>
    </LoadScript>
  );
};

export default MapComponent;
