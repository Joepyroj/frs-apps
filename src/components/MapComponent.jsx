import React, { useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100vh",
};

const center = {
  lat: -7.28916,
  lng: 112.73439,
};

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const MapComponent = ({ crimeReports = [], roadReports = [] }) => {
  const [selectedMarker, setSelectedMarker] = useState(null); // ⬅️ untuk simpan data marker yg diklik

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {/* Marker Kejahatan */}
        {crimeReports.map((report, index) =>
          report.location ? (
            <Marker
              key={`crime-${index}`}
              position={report.location}
              label="C"
              onClick={() => setSelectedMarker({ ...report, type: "crime" })}
            />
          ) : null
        )}

        {/* Marker Jalan Rusak */}
        {roadReports.map((report, index) =>
          report.location ? (
            <Marker
              key={`road-${index}`}
              position={report.location}
              label="R"
              icon={{
                url: "http://maps.google.com/mapfiles/ms/icons/orange-dot.png",
              }}
              onClick={() => setSelectedMarker({ ...report, type: "road" })}
            />
          ) : null
        )}

        {/* InfoWindow */}
        {selectedMarker && selectedMarker.location && (
          <InfoWindow
          position={selectedMarker.location}
          onCloseClick={() => setSelectedMarker(null)}
        >
          <div style={{ maxWidth: 200 }}>
            {selectedMarker.type === "crime" ? (
              <div>
                <h4>Kejahatan</h4>
                <p>{selectedMarker.description}</p>
                {selectedMarker.vehicleType && (
                  <>
                    <p><strong>Jenis:</strong> {selectedMarker.vehicleType}</p>
                    <p><strong>Plat:</strong> {selectedMarker.plateNumber}</p>
                    <p><strong>Merk:</strong> {selectedMarker.brand}</p>
                    <p><strong>Warna:</strong> {selectedMarker.color}</p>
                  </>
                )}
              </div>
            ) : (
              <div>
                <h4>Jalan Rusak</h4>
                <p>{selectedMarker.description}</p>
                <p><strong>Tingkat:</strong> {selectedMarker.severity}</p>
              </div>
            )}
          </div>
        </InfoWindow>
        
        )}
      </GoogleMap>
    </LoadScript>
  );
};

export default MapComponent;
