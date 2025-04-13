import React, { useState, useMemo } from "react";
import {
  GoogleMap,
  Marker,
  InfoWindow,
  useJsApiLoader // <-- Gunakan hook ini
  // LoadScript tidak lagi diperlukan di sini
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
};

const center = {
  lat: -7.28916,
  lng: 112.73439,
};

const apiKey = import.meta.env.VITE_Maps_API_KEY;

// Definisikan HANYA path statis ikon di luar komponen jika Anda mau
// Atau bisa juga didefinisikan langsung di dalam useMemo nanti
const ICON_PATHS = {
  crime: '/assets/crime-marker.png',
  road: '/assets/road-marker.png',
  station: '/assets/station-marker.png',
};

const MapComponent = ({
  crimeReports = [],
  roadReports = [],
  policeStations = [],
  onMapClick,
  selectedLocationForReport
}) => {
  // 1. Gunakan hook useJsApiLoader untuk memuat script Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script', // ID unik untuk elemen script
    googleMapsApiKey: apiKey,
    // libraries: ["places"], // Tambahkan library jika perlu (misal: places, geometry)
  });

  const [selectedInfoWindow, setSelectedInfoWindow] = useState(null);

  // 2. Definisikan objek ikon LENGKAP menggunakan useMemo, tergantung pada isLoaded
  const ICONS = useMemo(() => {
    // Jika script belum dimuat, kembalikan objek kosong atau default
    // Ini mencegah error saat mencoba akses window.google sebelum siap
    if (!isLoaded) {
        console.log("Google Maps script not loaded yet, returning empty ICONS");
        return {};
    }

    // Jika sudah dimuat, AMAN untuk mengakses window.google.maps
    console.log("Google Maps script loaded, defining ICONS");
    return {
      crime: {
        url: ICON_PATHS.crime,
        scaledSize: new window.google.maps.Size(30, 30) // Aman
      },
      road: {
        url: ICON_PATHS.road,
        scaledSize: new window.google.maps.Size(30, 30) // Aman
      },
      station: {
        url: ICON_PATHS.station,
        scaledSize: new window.google.maps.Size(30, 30) // Aman
      },
      selected: {
        path: window.google.maps.SymbolPath.CIRCLE, // Aman
        scale: 8,
        fillColor: "#EA4335",
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: "#FFFFFF"
      },
    };
  }, [isLoaded]); // <-- Dependensi penting: hitung ulang hanya saat isLoaded berubah

  // Handler (tidak berubah)
  const handleInternalMapClick = (e) => {
    if (onMapClick) {
      const location = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
      };
      onMapClick(location);
    }
  };

  const handleMarkerClick = (reportData) => {
    if (selectedLocationForReport && reportData.location?.lat === selectedLocationForReport.lat && reportData.location?.lng === selectedLocationForReport.lng) {
      return;
    }
    setSelectedInfoWindow(reportData);
  };

  // 3. Handle kondisi error dan loading
  if (loadError) {
    console.error("Error loading Google Maps:", loadError);
    // Berikan pesan error yang lebih informatif kepada pengguna
    return <div>Terjadi kesalahan saat memuat peta. Pastikan kunci API valid dan koneksi internet stabil. Coba refresh halaman.</div>;
  }

  if (!isLoaded) {
    // Tampilkan indikator loading yang jelas
    return <div style={containerStyle}><div className="map-loading-overlay">Memuat Peta...</div></div>; // Gunakan style loading Anda
  }

  // 4. Render peta HANYA jika sudah dimuat (isLoaded === true)
  // Tidak perlu <LoadScript> wrapper lagi
  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        clickableIcons: false,
      }}
      onClick={handleInternalMapClick}
    >
      {/* Marker Laporan Kejahatan (Gunakan ICONS yang sudah aman) */}
      {crimeReports.map((report, index) =>
        report.location && ICONS.crime ? ( // Pastikan ICONS.crime ada
          <Marker
            key={`crime-${report.id || index}`}
            position={report.location}
            icon={ICONS.crime}
            onClick={() => handleMarkerClick({ ...report, type: "crime" })}
            zIndex={1}
          />
        ) : null
      )}

      {/* Marker Laporan Jalan Rusak */}
      {roadReports.map((report, index) =>
        report.location && ICONS.road ? ( // Pastikan ICONS.road ada
          <Marker
            key={`road-${report.id || index}`}
            position={report.location}
            icon={ICONS.road}
            onClick={() => handleMarkerClick({ ...report, type: "road" })}
            zIndex={1}
          />
        ) : null
      )}

      {/* Marker Stasiun Polisi */}
      {policeStations.map((station, index) =>
          station.location && ICONS.station ? ( // Pastikan ICONS.station ada
          <Marker
              key={`station-${station.id || index}`}
              position={station.location}
              icon={ICONS.station}
              onClick={() => handleMarkerClick({ ...station, type: "station" })}
              zIndex={1}
          />
          ) : null
      )}


      {/* Marker Lokasi Pilihan Pengguna */}
      {selectedLocationForReport && ICONS.selected && ( // Pastikan ICONS.selected ada
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
          <div style={{ maxWidth: 200 }}>
            {/* ... Konten InfoWindow ... */}
            {selectedInfoWindow.type === "crime" && ( <div><h4>Kejahatan</h4><p>{selectedInfoWindow.description}</p></div> )}
            {selectedInfoWindow.type === "road" && ( <div><h4>Jalan Rusak</h4><p>{selectedInfoWindow.description}</p><p><strong>Tingkat:</strong> {selectedInfoWindow.severity}</p></div> )}
            {selectedInfoWindow.type === "station" && ( <div><h4>Kantor Polisi</h4><p><strong>{selectedInfoWindow.name}</strong></p><p>{selectedInfoWindow.address}</p></div> )}
          </div>
        </InfoWindow>
       )}
    </GoogleMap>
  );
};

export default MapComponent;