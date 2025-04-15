import React, { useState, useMemo, useCallback } from "react"; // Tambahkan useCallback jika belum ada
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader
} from "@react-google-maps/api";

// --- Import Ikon Langsung ---
// !! Sesuaikan path ini relatif terhadap lokasi file MapComponent.jsx !!
// Contoh jika MapComponent.jsx ada di src/components/ dan ikon di src/assets/icons/
import crimeIconUrl from '../assets/crime-marker.png';
import roadIconUrl from '../assets/road-marker.png';
import stationIconUrl from '../assets/station-marker.png';
// --- Akhir Import Ikon ---

const containerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = {
  lat: -7.28916,
  lng: 112.73439,
};

const apiKey = import.meta.env.VITE_Maps_API_KEY; // Pastikan nama ini benar
const libraries = ["marker"];

const MapComponent = ({
  crimeReports = [],
  roadReports = [],
  policeStations = [],
  onMapClick,
  selectedLocationForReport,
  mapCenter = defaultCenter
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: libraries,
  });

  const [selectedInfoWindow, setSelectedInfoWindow] = useState(null);

  // Definisikan objek ikon lengkap menggunakan useMemo dan URL hasil import
  const ICONS = useMemo(() => {
    if (!isLoaded) return {};
    try {
      if (!window.google || !window.google.maps || !window.google.maps.Size || !window.google.maps.SymbolPath) {
          console.error("MapComponent: window.google.maps objects not ready yet!");
          return {};
      }
      return {
        // Gunakan variabel hasil import untuk URL
        crime: { url: crimeIconUrl, scaledSize: new window.google.maps.Size(30, 30) },
        road: { url: roadIconUrl, scaledSize: new window.google.maps.Size(30, 30) },
        station: { url: stationIconUrl, scaledSize: new window.google.maps.Size(30, 30) },
        selected: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8, fillColor: "#EA4335", fillOpacity: 0.9, strokeWeight: 1.5, strokeColor: "#FFFFFF"
        },
      };
    } catch (error) {
      console.error("MapComponent: Error creating icon objects:", error);
      return {};
    }
  }, [isLoaded]);

  const handleInternalMapClick = useCallback((e) => {
    if (onMapClick) {
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      onMapClick(location);
    }
    setSelectedInfoWindow(null);
  }, [onMapClick]);

  const handleMarkerClick = useCallback((reportData) => {
    if (selectedLocationForReport && reportData.location?.lat === selectedLocationForReport.lat && reportData.location?.lng === selectedLocationForReport.lng) {
      return;
    }
    console.log("Marker clicked:", reportData);
    setSelectedInfoWindow(reportData);
  }, [selectedLocationForReport]);

  if (loadError) {
    console.error("Error loading Google Maps:", loadError);
    return <div style={{ padding: '20px', color: 'red' }}>Error memuat peta. Periksa API Key dan koneksi.</div>;
  }

  if (!isLoaded) {
    return <div style={containerStyle}><div className="map-loading-overlay">Memuat Peta...</div></div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={mapCenter}
      zoom={12}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      }}
      onClick={handleInternalMapClick}
    >
      {/* Render Marker Kejahatan */}
      {crimeReports.map((report) => {
        if (!report?.location || typeof report.location.lat !== 'number' || typeof report.location.lng !== 'number') return null;
        return (
          <Marker
            key={`crime-${report.id || report.location.lat}`}
            position={report.location}
            icon={ICONS.crime} // Gunakan ikon dari useMemo
            title={report.description || 'Laporan Kejahatan'}
            onClick={() => handleMarkerClick({ ...report, type: "crime" })}
            zIndex={1}
          />
        );
      })}

      {/* Render Marker Jalan Rusak */}
      {roadReports.map((report) => {
         if (!report?.location || typeof report.location.lat !== 'number' || typeof report.location.lng !== 'number') return null;
         return (
           <Marker
             key={`road-${report.id || report.location.lat}`}
             position={report.location}
             icon={ICONS.road} // Gunakan ikon dari useMemo
             title={report.description || 'Laporan Jalan Rusak'}
             onClick={() => handleMarkerClick({ ...report, type: "road" })}
             zIndex={1}
           />
         );
      })}

      {/* Render Marker Stasiun Polisi */}
      {policeStations.map((station) => {
         if (!station?.location || typeof station.location.lat !== 'number' || typeof station.location.lng !== 'number') return null;
         return (
           <Marker
             key={`station-${station.id || station.location.lat}`}
             position={station.location}
             icon={ICONS.station} // Gunakan ikon dari useMemo
             title={station.name || 'Stasiun Polisi'}
             onClick={() => handleMarkerClick({ ...station, type: "station" })}
             zIndex={1}
           />
          );
      })}

      {/* Marker untuk Lokasi yang Dipilih User */}
      {selectedLocationForReport && ICONS.selected && (
        <Marker
          position={selectedLocationForReport}
          icon={ICONS.selected}
          zIndex={10}
        />
      )}

      {/* InfoWindow */}
      {selectedInfoWindow && selectedInfoWindow.location && (
        <InfoWindow
          position={selectedInfoWindow.location}
          onCloseClick={() => setSelectedInfoWindow(null)}
        >
          <div style={{ maxWidth: 220, padding: '0 5px 5px 5px', fontSize: '13px', lineHeight: '1.4' }}>
            {/* ... Konten InfoWindow (sama seperti sebelumnya) ... */}
            {selectedInfoWindow.type === "crime" && ( <div> <h4 style={{marginTop: '5px', marginBottom: '8px'}}>Laporan Kejahatan</h4> <p><strong>Jenis:</strong> {selectedInfoWindow.description || '-'}</p> {selectedInfoWindow.vehicleType && (<> <p><strong>Kendaraan:</strong> {selectedInfoWindow.vehicleType} ({selectedInfoWindow.brand || '?'} {selectedInfoWindow.color || '?'})</p> <p><strong>No. Polisi:</strong> {selectedInfoWindow.plateNumber || '-'}</p> </>)} <p style={{fontSize: '11px', color: '#666', marginTop: '8px'}}>ID Laporan: {selectedInfoWindow.id?.substring(0,8)}...</p> </div> )}
            {selectedInfoWindow.type === "road" && ( <div> <h4 style={{marginTop: '5px', marginBottom: '8px'}}>Laporan Jalan Rusak</h4> <p><strong>Deskripsi:</strong> {selectedInfoWindow.description || '-'}</p> <p><strong>Tingkat:</strong> {selectedInfoWindow.severity || '-'}</p> <p style={{fontSize: '11px', color: '#666', marginTop: '8px'}}>ID Laporan: {selectedInfoWindow.id?.substring(0,8)}...</p> </div> )}
            {selectedInfoWindow.type === "station" && ( <div> <h4 style={{marginTop: '5px', marginBottom: '8px'}}>Stasiun Polisi</h4> <p><strong>{selectedInfoWindow.name || '-'}</strong></p> <p>{selectedInfoWindow.address || '-'}</p> </div> )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default MapComponent;