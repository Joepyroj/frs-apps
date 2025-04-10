import React, { useState, useEffect } from "react";
import { db } from "../config/firebaseConfig";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
import "./UserDashboard.css";

const initialCrimeReport = {
  description: "",
  vehicleType: "",
  plateNumber: "",
  brand: "",
  color: "",
  location: null,
};

const initialRoadReport = {
  description: "",
  severity: "ringan",
  location: null,
};

const UserDashboard = () => {
  const [activeForm, setActiveForm] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileData, setProfileData] = useState({
    nama: "",
    noKTP: "",
    alamat: "",
  });

  const [crimeReport, setCrimeReport] = useState(initialCrimeReport);
  const [roadReport, setRoadReport] = useState(initialRoadReport);
  const [crimeReportsData, setCrimeReportsData] = useState([]);
  const [roadReportsData, setRoadReportsData] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchUserData(user.uid);
        fetchReports();
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileComplete(data.verified && data.noKTP && data.alamat);
        setProfileData({
          nama: data.nama || "",
          noKTP: data.noKTP || "",
          alamat: data.alamat || "",
        });
      }
    } catch (err) {
      console.error("Gagal mengambil data profil:", err);
    }
  };

  const fetchReports = async () => {
    try {
      const [crimeSnap, roadSnap] = await Promise.all([
        getDocs(collection(db, "crime_reports")),
        getDocs(collection(db, "road_reports")),
      ]);
      setCrimeReportsData(crimeSnap.docs.map((doc) => doc.data()));
      setRoadReportsData(roadSnap.docs.map((doc) => doc.data()));
    } catch (err) {
      console.error("Gagal mengambil laporan:", err);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const { nama, noKTP, alamat } = profileData;
    if (!nama || !noKTP || !alamat) return alert("Mohon lengkapi semua field.");
    try {
      await setDoc(
        doc(db, "users", currentUserId),
        { nama, noKTP, alamat, verified: false },
        { merge: true }
      );
      alert("Profil berhasil disimpan. Tunggu verifikasi admin.");
      setActiveForm(null);
      fetchUserData(currentUserId);
    } catch (err) {
      console.error("Gagal menyimpan profil:", err);
    }
  };

  const handleCrimeReport = async (e) => {
    e.preventDefault();
    try {
      const data = {
        userId: currentUserId,
        description: crimeReport.description,
        location: crimeReport.location,
        timestamp: new Date(),
      };
      if (crimeReport.description === "Pencurian Kendaraan Bermotor") {
        Object.assign(data, {
          vehicleType: crimeReport.vehicleType,
          plateNumber: crimeReport.plateNumber,
          brand: crimeReport.brand,
          color: crimeReport.color,
        });
      }
      await addDoc(collection(db, "crime_reports"), data);
      alert("Laporan kejahatan berhasil dikirim!");
      setCrimeReport(initialCrimeReport);
      setActiveForm(null);
      fetchReports();
    } catch (err) {
      console.error("Gagal mengirim laporan kejahatan:", err);
    }
  };

  const handleRoadReport = async (e) => {
    e.preventDefault();
    try {
      await setDoc(
        doc(db, "road_reports", currentUserId),
        {
          ...roadReport,
          timestamp: new Date(),
        },
        { merge: true }
      );
      alert("Laporan jalan rusak berhasil dikirim!");
      setRoadReport(initialRoadReport);
      setActiveForm(null);
      fetchReports();
    } catch (err) {
      console.error("Gagal mengirim laporan jalan rusak:", err);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      return alert("Geolocation tidak didukung browser.");
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setCrimeReport((prev) => ({ ...prev, location: loc }));
        setRoadReport((prev) => ({ ...prev, location: loc }));
        document.querySelector(".location-status")?.classList.add("success");
      },
      (err) => {
        console.error("Gagal mendapatkan lokasi:", err);
        alert("Pastikan GPS aktif.");
      }
    );
  };

  const closeForm = () => {
    setActiveForm(null);
  };

  return (
    <div className="user-dashboard">
      {/* Sidebar trigger area */}
      <div className="sidebar-trigger"></div>
      
      {/* Sidebar */}
      <div className="sidebar">
        <h2>Menu User</h2>
        <ul>
          <li onClick={() => setActiveForm("profile")}>
            <span className="menu-icon">👤</span>
            <span className="menu-text">Lengkapi Profil</span>
          </li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("crime")}
          >
            <span className="menu-icon">🚨</span>
            <span className="menu-text">Laporkan Kejahatan</span>
          </li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("road")}
          >
            <span className="menu-icon">🚧</span>
            <span className="menu-text">Laporkan Jalan Rusak</span>
          </li>
        </ul>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <MapComponent
          crimeReports={crimeReportsData}
          roadReports={roadReportsData}
        />

        {!profileComplete && (
          <div className="warning">
            <h3>Silakan lengkapi profil terlebih dahulu!</h3>
            <p>Klik menu "Lengkapi Profil" pada sidebar untuk melanjutkan</p>
          </div>
        )}

        {activeForm === "profile" && (
          <ProfileForm
            data={profileData}
            setData={setProfileData}
            onSubmit={handleProfileSubmit}
            onClose={closeForm}
          />
        )}
        {activeForm === "crime" && (
          <CrimeForm
            data={crimeReport}
            setData={setCrimeReport}
            onSubmit={handleCrimeReport}
            onGetLocation={handleGetLocation}
            onClose={closeForm}
          />
        )}
        {activeForm === "road" && (
          <RoadForm
            data={roadReport}
            setData={setRoadReport}
            onSubmit={handleRoadReport}
            onGetLocation={handleGetLocation}
            onClose={closeForm}
          />
        )}
      </div>
    </div>
  );
};

// Modular Forms
const ProfileForm = ({ data, setData, onSubmit, onClose }) => (
  <div className="form-container">
    <form onSubmit={onSubmit} className="content">
      <div className="form-header">
        <h2>Lengkapi Profil</h2>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="form-group">
        <label htmlFor="nama">Nama Lengkap</label>
        <input
          id="nama"
          type="text"
          placeholder="Nama Sesuai KTP"
          value={data.nama}
          onChange={(e) => setData({ ...data, nama: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="noKTP">Nomor KTP</label>
        <input
          id="noKTP"
          type="text" 
          placeholder="Nomor KTP"
          value={data.noKTP}
          onChange={(e) => setData({ ...data, noKTP: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="alamat">Alamat Lengkap</label>
        <textarea
          id="alamat"
          placeholder="Alamat Lengkap"
          value={data.alamat}
          onChange={(e) => setData({ ...data, alamat: e.target.value })}
          required
        />
      </div>
      
      <div className="form-footer">
        <button type="submit" className="submit-btn">Simpan Profil</button>
      </div>
    </form>
  </div>
);

const CrimeForm = ({ data, setData, onSubmit, onGetLocation, onClose }) => (
  <div className="form-container">
    <form onSubmit={onSubmit} className="content">
      <div className="form-header">
        <h2>Laporkan Kejahatan</h2>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="form-group">
        <label htmlFor="crimeType">Jenis Kejahatan</label>
        <select
          id="crimeType"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          required
        >
          <option value="">Pilih Kejahatan</option>
          <option value="Pencurian Kendaraan Bermotor">
            Pencurian Kendaraan Bermotor
          </option>
          <option value="Balap Liar">Balap Liar</option>
        </select>
      </div>

      {data.description === "Pencurian Kendaraan Bermotor" && (
        <div className="vehicle-details">
          <div className="form-group">
            <label htmlFor="vehicleType">Jenis Kendaraan</label>
            <select
              id="vehicleType"
              value={data.vehicleType}
              onChange={(e) => setData({ ...data, vehicleType: e.target.value })}
              required
            >
              <option value="">Jenis Kendaraan</option>
              <option value="Roda 2">Roda 2</option>
              <option value="Roda 4">Roda 4</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="plateNumber">Nomor Polisi</label>
            <input
              id="plateNumber"
              type="text"
              placeholder="Contoh: B 1234 XYZ"
              value={data.plateNumber}
              onChange={(e) => setData({ ...data, plateNumber: e.target.value })}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group half">
              <label htmlFor="brand">Merk</label>
              <input
                id="brand"
                type="text"
                placeholder="Contoh: Honda"
                value={data.brand}
                onChange={(e) => setData({ ...data, brand: e.target.value })}
                required
              />
            </div>
            
            <div className="form-group half">
              <label htmlFor="color">Warna</label>
              <input
                id="color"
                type="text"
                placeholder="Contoh: Hitam"
                value={data.color}
                onChange={(e) => setData({ ...data, color: e.target.value })}
                required
              />
            </div>
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Lokasi Kejadian</label>
        <div className="location-field">
          <input
            type="text"
            placeholder="Klik tombol untuk mendapatkan lokasi"
            value={data.location ? `${data.location.lat}, ${data.location.lng}` : ""}
            readOnly
            className={data.location ? "has-location" : ""}
          />
          <button type="button" className="location-btn" onClick={onGetLocation}>
            <span className="location-icon">📍</span>
          </button>
        </div>
        <div className={`location-status ${data.location ? "success" : ""}`}>
          {data.location ? "Lokasi berhasil diambil" : "Lokasi belum diambil"}
        </div>
      </div>
      
      <div className="form-footer">
        <button type="submit" className="submit-btn" disabled={!data.location}>
          Kirim Laporan
        </button>
      </div>
    </form>
  </div>
);

const RoadForm = ({ data, setData, onSubmit, onGetLocation, onClose }) => (
  <div className="form-container">
    <form onSubmit={onSubmit} className="content">
      <div className="form-header">
        <h2>Laporkan Jalan Rusak</h2>
        <button type="button" className="close-btn" onClick={onClose}>×</button>
      </div>
      
      <div className="form-group">
        <label htmlFor="description">Deskripsi Kerusakan</label>
        <textarea
          id="description"
          placeholder="Jelaskan kondisi kerusakan jalan"
          value={data.description}
          onChange={(e) => setData({ ...data, description: e.target.value })}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="severity">Tingkat Kerusakan</label>
        <div className="severity-selector">
          <div 
            className={`severity-option ${data.severity === 'ringan' ? 'selected' : ''}`}
            onClick={() => setData({ ...data, severity: 'ringan' })}
          >
            <span className="severity-icon">🟢</span>
            <span>Ringan</span>
          </div>
          <div 
            className={`severity-option ${data.severity === 'sedang' ? 'selected' : ''}`}
            onClick={() => setData({ ...data, severity: 'sedang' })}
          >
            <span className="severity-icon">🟡</span>
            <span>Sedang</span>
          </div>
          <div 
            className={`severity-option ${data.severity === 'parah' ? 'selected' : ''}`}
            onClick={() => setData({ ...data, severity: 'parah' })}
          >
            <span className="severity-icon">🔴</span>
            <span>Parah</span>
          </div>
        </div>
      </div>
      
      <div className="form-group">
        <label>Lokasi Jalan Rusak</label>
        <div className="location-field">
          <input
            type="text"
            placeholder="Klik tombol untuk mendapatkan lokasi"
            value={data.location ? `${data.location.lat}, ${data.location.lng}` : ""}
            readOnly
            className={data.location ? "has-location" : ""}
          />
          <button type="button" className="location-btn" onClick={onGetLocation}>
            <span className="location-icon">📍</span>
          </button>
        </div>
        <div className={`location-status ${data.location ? "success" : ""}`}>
          {data.location ? "Lokasi berhasil diambil" : "Lokasi belum diambil"}
        </div>
      </div>
      
      <div className="form-footer">
        <button type="submit" className="submit-btn" disabled={!data.location}>
          Kirim Laporan
        </button>
      </div>
    </form>
  </div>
);

export default UserDashboard;