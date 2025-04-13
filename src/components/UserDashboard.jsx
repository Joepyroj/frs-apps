import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import "./UserDashboard.css"; // Pastikan CSS ini sudah mencakup style baru jika ada

// --- Initial State untuk Form ---
const initialCrimeReport = {
  description: "",
  vehicleType: "",
  plateNumber: "",
  brand: "",
  color: "",
  location: null, // Lokasi (lat, lng)
};

const initialRoadReport = {
  description: "",
  severity: "ringan", // Default severity
  location: null, // Lokasi (lat, lng)
};

const UserDashboard = () => {
  // --- State UI & Kontrol ---
  const [activeForm, setActiveForm] = useState(null); // 'profile', 'crime', 'road', atau null
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Kontrol sidebar
  const [locationSource, setLocationSource] = useState(null); // Sumber lokasi: 'gps', 'map', 'loading-gps', 'error-gps', null

  // --- State User ---
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState({ nama: "", noKTP: "", alamat: "" });

  // --- State Data Laporan ---
  const [crimeReport, setCrimeReport] = useState(initialCrimeReport);
  const [roadReport, setRoadReport] = useState(initialRoadReport);

  // --- State Data Peta ---
  const [crimeReportsData, setCrimeReportsData] = useState([]);
  const [roadReportsData, setRoadReportsData] = useState([]);
  // const [policeStationsData, setPoliceStationsData] = useState([]); // Jika perlu menampilkan stasiun
  const [loadingMapData, setLoadingMapData] = useState(true); // State loading untuk data peta

  // --- Fetch User Data & Nama ---
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

  // --- Fetch Laporan & Stasiun Polisi (jika perlu) untuk Peta ---
  const fetchMapData = useCallback(async () => {
    setLoadingMapData(true);
    try {
      const [crimeSnap, roadSnap /*, stationSnap */] = await Promise.all([
        getDocs(collection(db, "crime_reports")),
        getDocs(collection(db, "road_reports")),
       // getDocs(collection(db, "policeStations")) // Uncomment jika ingin ambil data stasiun
      ]);
      setCrimeReportsData(crimeSnap.docs.map((doc) => ({id: doc.id, ...doc.data()})));
      setRoadReportsData(roadSnap.docs.map((doc) => ({id: doc.id, ...doc.data()})));
     // setPoliceStationsData(stationSnap.docs.map((doc) => ({id: doc.id, ...doc.data()}))); // Uncomment jika perlu
    } catch (err) {
      console.error("Gagal mengambil data untuk peta:", err);
      // Set error state jika perlu
    } finally {
       setLoadingMapData(false);
    }
  }, []);

  // Panggil fetchMapData saat komponen mount
  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // --- Fungsi Buka Form & Sidebar ---
  const openFormSidebar = (formType) => {
    // Reset form state sesuai tipe
    if (formType === 'crime') setCrimeReport(initialCrimeReport);
    if (formType === 'road') setRoadReport(initialRoadReport);
    // Reset sumber lokasi
    setLocationSource(null);
    // Set form aktif dan buka sidebar
    setActiveForm(formType);
    setIsSidebarOpen(true);
  };

  // --- Fungsi Tutup Form & Sidebar ---
  const closeFormSidebar = () => {
    setActiveForm(null);
    setIsSidebarOpen(false);
    setLocationSource(null); // Reset sumber lokasi
  };

  // --- Handler Submit Form ---
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const { nama, noKTP, alamat } = profileData;
    if (!nama || !noKTP || !alamat) return alert("Mohon lengkapi semua field.");
    if (!currentUserId) return alert("User tidak terautentikasi.");

    try {
      await setDoc(
        doc(db, "users", currentUserId),
        { nama, noKTP, alamat, profileLastUpdated: Timestamp.now(), verified: false }, // Set verified ke false saat profil diupdate
        { merge: true }
      );
      alert("Profil berhasil disimpan. Verifikasi mungkin diperlukan.");
      fetchUserData(currentUserId); // Refresh data user & status profileComplete
      closeFormSidebar();
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
      alert("Gagal menyimpan profil.");
    }
  };

  const handleCrimeReportSubmit = async (e) => {
    e.preventDefault();
    if (!crimeReport.location) return alert("Mohon pilih lokasi kejadian.");
    if (!currentUserId) return alert("User tidak terautentikasi.");

    // Pastikan profil lengkap sebelum submit
    if (!profileComplete) {
        return alert("Profil Anda belum lengkap atau belum diverifikasi. Silakan lengkapi profil terlebih dahulu.");
    }


    try {
      const dataToSave = {
        userId: currentUserId,
        userName: profileData.nama || userName, // Nama pelapor dari profil
        description: crimeReport.description,
        location: crimeReport.location,
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
      fetchMapData(); // Refresh data peta
      closeFormSidebar();
    } catch (err) {
      console.error("Gagal mengirim laporan kejahatan:", err);
      alert("Gagal mengirim laporan kejahatan.");
    }
  };

  const handleRoadReportSubmit = async (e) => {
    e.preventDefault();
    if (!roadReport.location) return alert("Mohon pilih lokasi jalan rusak.");
    if (!currentUserId) return alert("User tidak terautentikasi.");

     // Pastikan profil lengkap sebelum submit
     if (!profileComplete) {
        return alert("Profil Anda belum lengkap atau belum diverifikasi. Silakan lengkapi profil terlebih dahulu.");
    }


    try {
        const dataToSave = {
            userId: currentUserId,
            userName: profileData.nama || userName, // Nama pelapor
            description: roadReport.description,
            severity: roadReport.severity,
            location: roadReport.location,
            timestamp: Timestamp.now(),
            status: "Baru",
        };
      await addDoc(collection(db, "road_reports"), dataToSave);
      alert("Laporan jalan rusak berhasil dikirim!");
      fetchMapData(); // Refresh data peta
      closeFormSidebar();
    } catch (err) {
      console.error("Gagal mengirim laporan jalan rusak:", err);
      alert("Gagal mengirim laporan jalan rusak.");
    }
  };

  // --- Handler untuk Klik Peta --- (BARU)
  const handleMapClick = useCallback((location) => {
    // Pastikan sidebar & form yang relevan terbuka
    if (isSidebarOpen && (activeForm === 'crime' || activeForm === 'road')) {
      console.log(`Map clicked for ${activeForm}:`, location);
      if (activeForm === 'crime') {
        setCrimeReport(prev => ({ ...prev, location: location }));
      } else if (activeForm === 'road') {
        setRoadReport(prev => ({ ...prev, location: location }));
      }
      setLocationSource('map'); // Tandai lokasi dari klik peta
    } else {
      console.log("Map clicked but no relevant report form is open.");
      // Optional: Tampilkan pesan bahwa form harus dibuka dulu
      // alert("Silakan buka form laporan kejahatan atau jalan rusak untuk memilih lokasi dari peta.");
    }
  }, [activeForm, isSidebarOpen]); // Dependensi

  // --- Handler Ambil Lokasi GPS (Tombol) --- (Diperbarui)
  const handleGetLocation = useCallback(() => {
    // Pastikan sidebar & form yang relevan terbuka
    if (!isSidebarOpen || (activeForm !== 'crime' && activeForm !== 'road')) {
      console.log("GetLocation clicked but no relevant report form is open.");
      return;
    }
    if (!navigator.geolocation) {
      return alert("Geolocation tidak didukung oleh browser Anda.");
    }
    setLocationSource('loading-gps'); // Status loading
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        if (activeForm === 'crime') {
          setCrimeReport((prev) => ({ ...prev, location: loc }));
        } else if (activeForm === 'road') {
          setRoadReport((prev) => ({ ...prev, location: loc }));
        }
        setLocationSource('gps'); // Tandai lokasi dari GPS
        console.log(`GPS Location acquired for ${activeForm}:`, loc);
      },
      (err) => {
        console.error("Gagal mendapatkan lokasi GPS:", err);
        alert("Gagal mendapatkan lokasi GPS. Pastikan GPS aktif dan izin lokasi diberikan.");
        setLocationSource('error-gps'); // Status error
      },
      { enableHighAccuracy: true }
    );
  }, [activeForm, isSidebarOpen]); // Dependensi

  // Tentukan lokasi yang akan ditampilkan sebagai marker pilihan di peta
  const selectedLocationForMapMarker = useMemo(() => {
      if (!isSidebarOpen) return null; // Jangan tampilkan jika sidebar tertutup
      if (activeForm === 'crime') return crimeReport.location;
      if (activeForm === 'road') return roadReport.location;
      return null;
  }, [activeForm, crimeReport.location, roadReport.location, isSidebarOpen]);


  // --- Render Komponen ---
  return (
    <div className={`user-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Kontainer Peta Fullscreen */}
      <div className="map-container-fullscreen">
       { loadingMapData ? (
            <div className="map-loading-overlay">Memuat Peta dan Laporan...</div>
        ) : (
           <MapComponent
              crimeReports={crimeReportsData}
              roadReports={roadReportsData}
              // policeStations={policeStationsData} // Jika perlu
              onMapClick={handleMapClick} // <-- Pass handler klik peta
              selectedLocationForReport={selectedLocationForMapMarker} // <-- Pass lokasi terpilih
            />
        )}
        {/* Peringatan jika profil belum lengkap */}
        {!profileComplete && !loadingUser && !isSidebarOpen && (
             <div className="profile-warning-overlay">
                Lengkapi profil Anda untuk dapat membuat laporan.
            </div>
         )}
      </div>

      {/* Kontrol Overlay di Atas Peta */}
      <div className="overlay-controls">
        {!isSidebarOpen && (
          <span className="user-greeting-overlay">
            {loadingUser ? "Memuat..." : `Halo, ${userName}`}
          </span>
        )}
        {/* Tombol Aksi */}
        <button
          onClick={() => openFormSidebar('profile')}
          className="control-button-overlay"
          title="Lengkapi/Edit Profil"
        >
          <span role="img" aria-label="profile">👤</span> Profil
        </button>
        <button
          onClick={() => openFormSidebar('crime')}
          className="control-button-overlay"
          disabled={!profileComplete || loadingUser}
          title={profileComplete ? "Laporkan Kejahatan" : "Lengkapi profil terlebih dahulu"}
        >
          <span role="img" aria-label="crime">🚨</span> Lapor Kejahatan
        </button>
        <button
          onClick={() => openFormSidebar('road')}
          className="control-button-overlay"
          disabled={!profileComplete || loadingUser}
          title={profileComplete ? "Laporkan Jalan Rusak" : "Lengkapi profil terlebih dahulu"}
        >
          <span role="img" aria-label="road">🚧</span> Lapor Jalan Rusak
        </button>
      </div>

      {/* Sidebar Geser (Berisi Form) */}
      <div className="sidebar-overlay">
        <div className="sidebar-form-content">
            {/* Render form yang aktif */}
            {activeForm === 'profile' && (
              <ProfileForm
                data={profileData}
                setData={setProfileData}
                onSubmit={handleProfileSubmit}
                onClose={closeFormSidebar}
              />
            )}
            {activeForm === 'crime' && (
              <CrimeForm
                data={crimeReport}
                setData={setCrimeReport}
                onSubmit={handleCrimeReportSubmit}
                onGetLocation={handleGetLocation} // Handler ambil lokasi
                onClose={closeFormSidebar}
                locationSource={locationSource} // <-- Pass sumber lokasi
                isSidebarOpen={isSidebarOpen} // <-- Pass status sidebar
              />
            )}
            {activeForm === 'road' && (
              <RoadForm
                data={roadReport}
                setData={setRoadReport}
                onSubmit={handleRoadReportSubmit}
                onGetLocation={handleGetLocation} // Handler ambil lokasi
                onClose={closeFormSidebar}
                locationSource={locationSource} // <-- Pass sumber lokasi
                isSidebarOpen={isSidebarOpen} // <-- Pass status sidebar
              />
            )}
        </div>
      </div>
    </div>
  );
};


const FormLocationSection = ({ location, onGetLocation, locationSource, isSidebarOpen, formType }) => {
  const getStatusText = () => {
    if (locationSource === 'map') return "Lokasi dipilih dari Peta";
    if (locationSource === 'gps') return "Lokasi dari GPS";
    if (locationSource === 'loading-gps') return "Mencari lokasi GPS...";
    if (locationSource === 'error-gps') return "Gagal mendapatkan GPS";
    return location ? "Lokasi sudah dipilih" : "Lokasi belum dipilih";
  };

  const labelText = formType === 'crime' ? 'Lokasi Kejadian' : 'Lokasi Jalan Rusak';
  const placeholderText = isSidebarOpen ? "Klik tombol Lokasi Saya atau klik pada Peta" : "Klik tombol Lokasi Saya";


  return (
    <div className="form-group-sidebar">
      <label>{labelText}</label>
      <div className="location-field-sidebar">
        <input
          type="text"
          placeholder={placeholderText}
          value={location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : ""}
          readOnly
          className={location ? "has-location" : ""}
        />
        <button type="button" className="location-btn-sidebar" onClick={onGetLocation} title="Dapatkan Lokasi GPS Saat Ini">
          <span className="location-icon">📍</span> {/* Atau ikon GPS */}
        </button>
      </div>
      {/* Tampilkan status sumber lokasi */}
      <div className={`location-status-sidebar ${location ? "success" : ""} ${locationSource === 'error-gps' ? 'error' : ''}`}>
           {getStatusText()}
      </div>
       {/* Tambahkan pesan instruksi klik peta jika form terbuka */}
      {isSidebarOpen && !location && (
           <div className="location-instruction">Anda juga bisa klik langsung pada peta untuk memilih lokasi.</div>
      )}
    </div>
  );
};


const ProfileForm = ({ data, setData, onSubmit, onClose }) => (
  <div className="form-in-sidebar">
    <form onSubmit={onSubmit} className="form-content-sidebar">
      <div className="form-header-sidebar">
        <h2>Profil Pengguna</h2> {/* Judul diperjelas */}
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
      <p className="form-note">Perubahan profil mungkin memerlukan verifikasi ulang oleh Admin.</p>
    </form>
  </div>
);


const CrimeForm = ({ data, setData, onSubmit, onGetLocation, onClose, locationSource, isSidebarOpen }) => (
   <div className="form-in-sidebar">
    <form onSubmit={onSubmit} className="form-content-sidebar">
      <div className="form-header-sidebar">
        <h2>Laporkan Kejahatan</h2>
        <button type="button" className="close-form-btn" onClick={onClose}>×</button>
      </div>

      {/* Input Jenis Kejahatan */}
      <div className="form-group-sidebar">
        <label htmlFor="crimeType">Jenis Kejahatan</label>
        <select id="crimeType" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value, vehicleType:'', plateNumber:'', brand:'', color:'' })} required>
          <option value="">Pilih Jenis Kejahatan</option>
          <option value="Pencurian Kendaraan Bermotor">Pencurian Kendaraan Bermotor</option>
          <option value="Balap Liar">Balap Liar</option>
          <option value="Pembegalan">Pembegalan</option>
          <option value="Tawuran">Tawuran</option>
          <option value="Lainnya">Lainnya</option> {/* Tambah opsi Lainnya */}
        </select>
      </div>

      {/* Detail Kendaraan (jika Pencurian) */}
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

      {/* Gunakan Komponen Lokasi */}
      <FormLocationSection
        location={data.location}
        onGetLocation={onGetLocation}
        locationSource={locationSource}
        isSidebarOpen={isSidebarOpen}
        formType="crime"
      />

      {/* Input Deskripsi Tambahan (jika jenis 'Lainnya') */}
      {data.description === "Lainnya" && (
         <div className="form-group-sidebar">
            <label htmlFor="crimeDescriptionOther">Deskripsi Kejahatan Lainnya</label>
            <textarea id="crimeDescriptionOther" placeholder="Jelaskan kejahatan yang Anda lihat" value={data.otherDescription || ''} onChange={(e) => setData({ ...data, otherDescription: e.target.value })} required />
          </div>
      )}


      <div className="form-footer-sidebar">
        <button type="submit" className="submit-form-btn" disabled={!data.location}>Kirim Laporan</button>
      </div>
    </form>
  </div>
);

const RoadForm = ({ data, setData, onSubmit, onGetLocation, onClose, locationSource, isSidebarOpen }) => (
  <div className="form-in-sidebar">
    <form onSubmit={onSubmit} className="form-content-sidebar">
       <div className="form-header-sidebar">
        <h2>Laporkan Jalan Rusak</h2>
        <button type="button" className="close-form-btn" onClick={onClose}>×</button>
      </div>

      {/* Input Deskripsi */}
      <div className="form-group-sidebar">
        <label htmlFor="roadDescription">Deskripsi Kerusakan</label>
        <textarea id="roadDescription" placeholder="Jelaskan kondisi kerusakan jalan (misal: berlubang, retak, amblas)" value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} required />
      </div>

      {/* Input Tingkat Kerusakan */}
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

       {/* Gunakan Komponen Lokasi */}
       <FormLocationSection
        location={data.location}
        onGetLocation={onGetLocation}
        locationSource={locationSource}
        isSidebarOpen={isSidebarOpen}
        formType="road"
      />

      <div className="form-footer-sidebar">
        <button type="submit" className="submit-form-btn" disabled={!data.location}>Kirim Laporan</button>
      </div>
    </form>
  </div>
);


export default UserDashboard;