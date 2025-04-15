import React, { useState, useEffect, useCallback, useMemo } from "react"; // <-- Added useMemo here
import { db } from "../config/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
// !! Sesuaikan nama file CSS Anda !!
import "./UserDashboard.css"; // <-- Ganti jika perlu (misal: ./UserDashboardOverlay.css)

// --- Komponen Form (Definisi di bawah atau import) ---

// --- Update Initial State ---
const initialCrimeReport = {
  description: "",
  vehicleType: "",
  plateNumber: "",
  brand: "",
  color: "",
  location: null,
  streetName: "", // <-- Tambahkan field nama jalan
};

const initialRoadReport = {
  description: "",
  severity: "ringan",
  location: null,
  streetName: "", // <-- Tambahkan field nama jalan
};

// Ambil API Key (pastikan nama variabel ini benar)
const mapsApiKey = import.meta.env.VITE_Maps_API_KEY;

const UserDashboard = () => {
  const [activeForm, setActiveForm] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState({ nama: "", noKTP: "", alamat: "" });

  // --- Update State Form ---
  const [crimeReport, setCrimeReport] = useState(initialCrimeReport);
  const [roadReport, setRoadReport] = useState(initialRoadReport);
  const [isGeocoding, setIsGeocoding] = useState(false); // State loading geocoding

  const [crimeReportsData, setCrimeReportsData] = useState([]);
  const [roadReportsData, setRoadReportsData] = useState([]);

  // --- Fetch User Data & Name ---
  const fetchUserData = useCallback(async (userId) => {
    setLoadingUser(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserName(data.name || `User ${userId.substring(0, 5)}`);
        const hasRequiredProfile = !!(data.nama && data.noKTP && data.alamat);
        setProfileComplete(hasRequiredProfile);
        setProfileData({
          nama: data.nama || "",
          noKTP: data.noKTP || "",
          alamat: data.alamat || "",
        });
      } else {
        setUserName(`User ${userId.substring(0, 5)}`);
        setProfileComplete(false);
      }
    } catch (err) {
      console.error("Gagal mengambil data profil:", err);
      setUserName("User");
      setProfileComplete(false);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // --- Listener Auth State ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchUserData(user.uid);
      } else {
        setCurrentUserId(null);
        setUserName("");
        setLoadingUser(false);
        setProfileComplete(false);
      }
    });
    return () => unsubscribe();
  }, [fetchUserData]);

  // --- Fetch Laporan untuk Peta ---
   const fetchMapReports = useCallback(async () => {
    try {
      const [crimeSnap, roadSnap] = await Promise.all([
        getDocs(collection(db, "crime_reports")),
        getDocs(collection(db, "road_reports")),
      ]);
      setCrimeReportsData(crimeSnap.docs.map((doc) => ({id: doc.id, ...doc.data()})));
      setRoadReportsData(roadSnap.docs.map((doc) => ({id: doc.id, ...doc.data()})));
    } catch (err) {
      console.error("Gagal mengambil data untuk peta:", err);
    }
   }, []);

   useEffect(() => { fetchMapReports(); }, [fetchMapReports]);


  // --- Fungsi Buka/Tutup Form & Sidebar ---
  const openFormSidebar = (formType) => {
    if (formType === 'crime') setCrimeReport(initialCrimeReport);
    if (formType === 'road') setRoadReport(initialRoadReport);
    setActiveForm(formType);
    setIsSidebarOpen(true);
  };

  const closeFormSidebar = () => {
    setActiveForm(null);
    setIsSidebarOpen(false);
  };

  // --- Fungsi Reverse Geocode BARU ---
  const reverseGeocode = useCallback(async (lat, lng) => {
    if (!mapsApiKey) {
      console.error("API Key Google Maps tidak ditemukan!");
      return "Tidak dapat mengambil nama jalan (API Key Error)";
    }
    setIsGeocoding(true);
    console.log(`Geocoding for: ${lat}, ${lng}`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsApiKey}&result_type=route`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      console.log("Geocode Response:", data);

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const routeComponent = data.results[0].address_components.find(comp =>
          comp.types.includes('route')
        );
        if (routeComponent) {
          return routeComponent.long_name;
        } else {
            const formattedAddress = data.results[0].formatted_address;
            return formattedAddress.split(',')[0] || "Nama jalan tidak ditemukan";
        }
      } else if (data.status === 'ZERO_RESULTS') {
        return "Nama jalan tidak ditemukan";
      } else {
        console.error("Geocoding API Error:", data.status, data.error_message);
        return `Error: ${data.status}`;
      }
    } catch (error) {
      console.error("Fetch Geocoding Error:", error);
      return "Gagal mengambil nama jalan (Network Error)";
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  // --- Handler Ambil Lokasi (Diperbarui) ---
  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      return alert("Geolocation tidak didukung.");
    }
    console.log("Getting location...");
    setIsGeocoding(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const loc = { lat, lng };
        console.log("Location acquired:", loc);

        const street = await reverseGeocode(lat, lng);
        console.log("Street name found:", street);

        if (activeForm === 'crime') {
          setCrimeReport((prev) => ({ ...prev, location: loc, streetName: street }));
        } else if (activeForm === 'road') {
          setRoadReport((prev) => ({ ...prev, location: loc, streetName: street }));
        }
      },
      (err) => {
          console.error("Gagal mendapatkan lokasi GPS:", err);
          alert("Gagal mendapatkan lokasi GPS. Pastikan GPS aktif dan izin lokasi diberikan.");
          setIsGeocoding(false);
      },
      { enableHighAccuracy: true }
    );
  }, [activeForm, reverseGeocode]);

  // --- Handler Submit Form (Diperbarui) ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const { nama, noKTP, alamat } = profileData;
    if (!nama || !noKTP || !alamat) return alert("Mohon lengkapi semua field.");
    if (!currentUserId) return alert("User tidak terautentikasi.");

    try {
      await setDoc(
        doc(db, "users", currentUserId),
        { nama, noKTP, alamat, profileLastUpdated: Timestamp.now(), verified: false },
        { merge: true }
      );
      alert("Profil berhasil disimpan. Verifikasi mungkin diperlukan.");
      fetchUserData(currentUserId);
      closeFormSidebar();
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
      alert("Gagal menyimpan profil.");
    }
  };

  const handleCrimeReportSubmit = async (e) => {
    e.preventDefault();
    if (!crimeReport.location || !currentUserId) return;
    try {
      const dataToSave = {
        userId: currentUserId,
        userName: profileData.nama || userName,
        description: crimeReport.description,
        location: crimeReport.location,
        streetName: crimeReport.streetName || "N/A",
        timestamp: Timestamp.now(),
        status: "Baru",
        ...(crimeReport.description === "Pencurian Kendaraan Bermotor" && {
            vehicleType: crimeReport.vehicleType,
            plateNumber: crimeReport.plateNumber,
            brand: crimeReport.brand,
            color: crimeReport.color,
        }),
      };
      await addDoc(collection(db, "crime_reports"), dataToSave);
      alert("Laporan kejahatan berhasil dikirim!");
      fetchMapReports(); closeFormSidebar();
    } catch (err) {
        console.error("Gagal mengirim laporan kejahatan:", err);
        alert("Gagal mengirim laporan kejahatan.");
    }
  };

  const handleRoadReportSubmit = async (e) => {
    e.preventDefault();
    if (!roadReport.location || !currentUserId) return;
    try {
      const dataToSave = {
        userId: currentUserId,
        userName: profileData.nama || userName,
        description: roadReport.description,
        severity: roadReport.severity,
        location: roadReport.location,
        streetName: roadReport.streetName || "N/A",
        timestamp: Timestamp.now(),
        status: "Baru",
      };
      await addDoc(collection(db, "road_reports"), dataToSave);
      alert("Laporan jalan rusak berhasil dikirim!");
      fetchMapReports(); closeFormSidebar();
    } catch (err) {
        console.error("Gagal mengirim laporan jalan rusak:", err);
        alert("Gagal mengirim laporan jalan rusak.");
    }
  };

  // Di dalam UserDashboard.jsx

const handleMapClick = useCallback(async (location) => {
  // Pastikan sidebar & form yang relevan terbuka
  if (isSidebarOpen && (activeForm === 'crime' || activeForm === 'road')) {
      console.log(`Map clicked, updating ${activeForm} form:`, location);

      // Panggil reverse geocode untuk mendapatkan nama jalan DULU
      const street = await reverseGeocode(location.lat, location.lng);
      console.log("Street name from map click:", street);

      // Baru update state form yang relevan DENGAN lokasi DAN nama jalan
      if (activeForm === 'crime') {
          setCrimeReport(prev => ({ ...prev, location: location, streetName: street }));
      } else if (activeForm === 'road') {
          setRoadReport(prev => ({ ...prev, location: location, streetName: street }));
      }
      // Anda mungkin ingin menambahkan state 'locationSource' seperti di file asli
      // setLocationSource('map');
  } else {
      console.log("Map clicked but no relevant report form is open.");
      // Opsional: Tampilkan pesan bahwa form harus dibuka dulu
      // alert("Silakan buka form laporan kejahatan atau jalan rusak untuk memilih lokasi dari peta.");
  }
}, [activeForm, isSidebarOpen, reverseGeocode]); // Tambahkan dependensi

 // Determine selected location for map marker based on active form
 const selectedLocationForMapMarker = useMemo(() => {
    if (!isSidebarOpen) return null;
    if (activeForm === 'crime') return crimeReport.location;
    if (activeForm === 'road') return roadReport.location;
    return null;
 }, [isSidebarOpen, activeForm, crimeReport.location, roadReport.location]);


  // --- Render Komponen ---
  return (
    <div className={`user-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
       <div className="map-container-fullscreen">
          <MapComponent
              crimeReports={crimeReportsData}
              roadReports={roadReportsData}
              selectedLocationForReport={selectedLocationForMapMarker}
              onMapClick={handleMapClick}
           />
            {!profileComplete && !loadingUser && !isSidebarOpen && (
                 <div className="profile-warning-overlay">
                    Lengkapi profil Anda untuk dapat membuat laporan.
                </div>
             )}
        </div>
        <div className="overlay-controls">
          {!isSidebarOpen && (
            <span className="user-greeting-overlay">
              {loadingUser ? "Memuat..." : `Halo, ${userName}`}
            </span>
          )}
          <button onClick={() => openFormSidebar('profile')} className="control-button-overlay" title="Lengkapi/Edit Profil">
              <span role="img" aria-label="profile">👤</span> Profil
          </button>
          <button onClick={() => openFormSidebar('crime')} className="control-button-overlay" disabled={!profileComplete || loadingUser} title={profileComplete ? "Laporkan Kejahatan" : "Lengkapi profil terlebih dahulu"}>
              <span role="img" aria-label="crime">🚨</span> Lapor Kejahatan
          </button>
          <button onClick={() => openFormSidebar('road')} className="control-button-overlay" disabled={!profileComplete || loadingUser} title={profileComplete ? "Laporkan Jalan Rusak" : "Lengkapi profil terlebih dahulu"}>
              <span role="img" aria-label="road">🚧</span> Lapor Jalan Rusak
          </button>
        </div>

      <div className="sidebar-overlay">
        <div className="sidebar-form-content">
          {activeForm === 'profile' && (<ProfileForm data={profileData} setData={setProfileData} onSubmit={handleProfileSubmit} onClose={closeFormSidebar} />)}
          {activeForm === 'crime' && (<CrimeForm data={crimeReport} setData={setCrimeReport} onSubmit={handleCrimeReportSubmit} onGetLocation={handleGetLocation} onClose={closeFormSidebar} isGeocoding={isGeocoding} />)}
          {activeForm === 'road' && (<RoadForm data={roadReport} setData={setRoadReport} onSubmit={handleRoadReportSubmit} onGetLocation={handleGetLocation} onClose={closeFormSidebar} isGeocoding={isGeocoding} />)}
        </div>
      </div>
    </div>
  );
};


// ======================================================
// --- Update Komponen Formulir ---
// ======================================================

const ProfileForm = ({ data, setData, onSubmit, onClose }) => (
  <div className="form-in-sidebar">
    <form onSubmit={onSubmit} className="form-content-sidebar">
      <div className="form-header-sidebar">
        <h2>Profil Pengguna</h2>
        <button type="button" className="close-form-btn" onClick={onClose}>×</button>
      </div>

      <div className="form-group-sidebar">
        <label htmlFor="nama">Nama Lengkap</label>
        <input id="nama" type="text" placeholder="Nama Sesuai KTP" value={data.nama} onChange={(e) => setData({ ...data, nama: e.target.value })} required />
      </div>
      <div className="form-group-sidebar">
        <label htmlFor="noKTP">Nomor KTP</label>
        <input id="noKTP" type="text" placeholder="Nomor KTP" value={data.noKTP} onChange={(e) => setData({ ...data, noKTP: e.target.value })} required />
      </div>
      <div className="form-group-sidebar">
        <label htmlFor="alamat">Alamat Lengkap</label>
        <textarea id="alamat" placeholder="Alamat Lengkap Sesuai KTP" value={data.alamat} onChange={(e) => setData({ ...data, alamat: e.target.value })} required />
      </div>

      <div className="form-footer-sidebar">
        <button type="submit" className="submit-form-btn">Simpan Profil</button>
      </div>
    </form>
  </div>
);

// Update CrimeForm & RoadForm untuk menerima & menampilkan streetName + isGeocoding
const CrimeForm = ({ data, setData, onSubmit, onGetLocation, onClose, isGeocoding }) => (
    <div className="form-in-sidebar">
     <form onSubmit={onSubmit} className="form-content-sidebar">
       <div className="form-header-sidebar"><h2>Laporkan Kejahatan</h2><button type="button" className="close-form-btn" onClick={onClose}>×</button></div>
       <div className="form-group-sidebar">
           <label htmlFor="crimeType">Jenis Kejahatan</label>
           <select id="crimeType" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value, vehicleType:'', plateNumber:'', brand:'', color:'' })} required>
             <option value="">Pilih Jenis Kejahatan</option>
             <option value="Pencurian Kendaraan Bermotor">Pencurian Kendaraan Bermotor</option>
             <option value="Balap Liar">Balap Liar</option>
             <option value="Pembegalan">Pembegalan</option>
             <option value="Tawuran">Tawuran</option>
             <option value="Lainnya">Lainnya</option>
           </select>
       </div>

       {data.description === "Pencurian Kendaraan Bermotor" && (
         <div className="vehicle-details-sidebar">
            <div className="form-group-sidebar">
                <label htmlFor="vehicleType">Jenis Kendaraan</label>
                <select id="vehicleType" value={data.vehicleType} onChange={(e) => setData({ ...data, vehicleType: e.target.value })} required>
                  <option value="">Pilih Jenis</option>
                  <option value="Roda 2">Roda 2</option>
                  <option value="Roda 4">Roda 4</option>
                </select>
            </div>
            <div className="form-group-sidebar">
                <label htmlFor="plateNumber">Nomor Polisi</label>
                <input id="plateNumber" type="text" placeholder="Contoh: L 1234 AB" value={data.plateNumber} onChange={(e) => setData({ ...data, plateNumber: e.target.value })} required />
            </div>
            <div className="form-row-sidebar">
                <div className="form-group-half">
                  <label htmlFor="brand">Merk</label>
                  <input id="brand" type="text" placeholder="Contoh: Honda" value={data.brand} onChange={(e) => setData({ ...data, brand: e.target.value })} required />
                </div>
                <div className="form-group-half">
                  <label htmlFor="color">Warna</label>
                  <input id="color" type="text" placeholder="Contoh: Hitam" value={data.color} onChange={(e) => setData({ ...data, color: e.target.value })} required />
                </div>
            </div>
         </div>
       )}

       <div className="form-group-sidebar">
         <label>Lokasi Kejadian</label>
         <div className="location-field-sidebar">
           <input type="text" placeholder="Klik tombol Lokasi Saya atau pilih di Peta" value={data.location ? `${data.location.lat.toFixed(5)}, ${data.location.lng.toFixed(5)}` : ""} readOnly />
           <button type="button" className="location-btn-sidebar" onClick={onGetLocation} title="Dapatkan Lokasi Saat Ini" disabled={isGeocoding}>
             {isGeocoding ? <span className="spinner-small"></span> : <span className="location-icon">📍</span>}
           </button>
         </div>
          <div className={`location-status-sidebar ${data.location ? "success" : ""}`}>{data.location ? "Lokasi GPS/Peta berhasil diambil." : ""}</div>

          <div style={{marginTop: '10px'}}>
            <label htmlFor="streetName" style={{fontWeight: 'normal', fontSize:'12px'}}>Nama Jalan (Otomatis)</label>
            <input id="streetName" type="text" value={isGeocoding ? "Mencari nama jalan..." : data.streetName || "-"} readOnly style={{backgroundColor: '#eee', fontSize: '13px'}} />
          </div>
       </div>

       {data.description === "Lainnya" && (
            <div className="form-group-sidebar">
               <label htmlFor="crimeDescriptionOther">Deskripsi Kejahatan Lainnya</label>
               <textarea id="crimeDescriptionOther" placeholder="Jelaskan kejahatan yang Anda lihat" value={data.otherDescription || ''} onChange={(e) => setData({ ...data, otherDescription: e.target.value })} required />
             </div>
         )}

       <div className="form-footer-sidebar"><button type="submit" className="submit-form-btn" disabled={!data.location || isGeocoding}>Kirim Laporan</button></div>
     </form>
   </div>
);

const RoadForm = ({ data, setData, onSubmit, onGetLocation, onClose, isGeocoding }) => (
  <div className="form-in-sidebar">
    <form onSubmit={onSubmit} className="form-content-sidebar">
      <div className="form-header-sidebar"><h2>Laporkan Jalan Rusak</h2><button type="button" className="close-form-btn" onClick={onClose}>×</button></div>
      <div className="form-group-sidebar">
          <label htmlFor="roadDescription">Deskripsi Kerusakan</label>
          <textarea id="roadDescription" placeholder="Jelaskan kondisi kerusakan jalan (misal: berlubang, retak, amblas)" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} required />
      </div>
      <div className="form-group-sidebar">
          <label>Tingkat Kerusakan</label>
          <div className="severity-selector-sidebar">
              {['ringan', 'sedang', 'parah'].map(level => (
                   <div key={level} className={`severity-option-sidebar ${data.severity === level ? 'selected' : ''}`} onClick={() => setData({ ...data, severity: level })}>
                      <span className={`severity-icon ${level}`}>
                        {level === 'ringan' ? '🟢' : level === 'sedang' ? '🟡' : '🔴'}
                      </span>
                      <span className="severity-text">{level.charAt(0).toUpperCase() + level.slice(1)}</span>
                  </div>
              ))}
          </div>
      </div>

      <div className="form-group-sidebar">
        <label>Lokasi Jalan Rusak</label>
        <div className="location-field-sidebar">
          <input type="text" placeholder="Klik tombol Lokasi Saya atau pilih di Peta" value={data.location ? `${data.location.lat.toFixed(5)}, ${data.location.lng.toFixed(5)}` : ""} readOnly />
          <button type="button" className="location-btn-sidebar" onClick={onGetLocation} title="Dapatkan Lokasi Saat Ini" disabled={isGeocoding}>
            {isGeocoding ? <span className="spinner-small"></span> : <span className="location-icon">📍</span>}
          </button>
        </div>
         <div className={`location-status-sidebar ${data.location ? "success" : ""}`}>{data.location ? "Lokasi GPS/Peta berhasil diambil." : ""}</div>

         <div style={{marginTop: '10px'}}>
           <label htmlFor="streetNameRoad" style={{fontWeight: 'normal', fontSize:'12px'}}>Nama Jalan (Otomatis)</label>
           <input id="streetNameRoad" type="text" value={isGeocoding ? "Mencari nama jalan..." : data.streetName || "-"} readOnly style={{backgroundColor: '#eee', fontSize: '13px'}} />
         </div>
      </div>

      <div className="form-footer-sidebar"><button type="submit" className="submit-form-btn" disabled={!data.location || isGeocoding}>Kirim Laporan</button></div>
    </form>
  </div>
);

export default UserDashboard;