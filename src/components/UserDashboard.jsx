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
      },
      (err) => {
        console.error("Gagal mendapatkan lokasi:", err);
        alert("Pastikan GPS aktif.");
      }
    );
  };

  return (
    <div className="user-dashboard">
      <div className="sidebar">
        <h2>Menu User</h2>
        <ul>
          <li onClick={() => setActiveForm("profile")}>Lengkapi Profil</li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("crime")}
          >
            Laporkan Kejahatan
          </li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("road")}
          >
            Laporkan Jalan Rusak
          </li>
        </ul>
      </div>

      <div className="map-container">
        <MapComponent
          crimeReports={crimeReportsData}
          roadReports={roadReportsData}
        />

        {!profileComplete && (
          <div className="warning">
            <h3>Silakan lengkapi profil terlebih dahulu!</h3>
          </div>
        )}

        {activeForm === "profile" && (
          <ProfileForm
            data={profileData}
            setData={setProfileData}
            onSubmit={handleProfileSubmit}
          />
        )}
        {activeForm === "crime" && (
          <CrimeForm
            data={crimeReport}
            setData={setCrimeReport}
            onSubmit={handleCrimeReport}
            onGetLocation={handleGetLocation}
          />
        )}
        {activeForm === "road" && (
          <RoadForm
            data={roadReport}
            setData={setRoadReport}
            onSubmit={handleRoadReport}
            onGetLocation={handleGetLocation}
          />
        )}
      </div>
    </div>
  );
};

// Modular Forms
const ProfileForm = ({ data, setData, onSubmit }) => (
  <form onSubmit={onSubmit} className="content">
    <h2>Lengkapi Profil</h2>
    <input
      type="text"
      placeholder="Nama Sesuai KTP"
      value={data.nama}
      onChange={(e) => setData({ ...data, nama: e.target.value })}
      required
    />
    <input
      type="text"
      placeholder="Nomor KTP"
      value={data.noKTP}
      onChange={(e) => setData({ ...data, noKTP: e.target.value })}
      required
    />
    <textarea
      placeholder="Alamat Lengkap"
      value={data.alamat}
      onChange={(e) => setData({ ...data, alamat: e.target.value })}
      required
    />
    <button type="submit">Simpan Profil</button>
  </form>
);

const CrimeForm = ({ data, setData, onSubmit, onGetLocation }) => (
  <form onSubmit={onSubmit} className="content">
    <h2>Laporkan Kejahatan</h2>
    <select
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

    {data.description === "Pencurian Kendaraan Bermotor" && (
      <>
        <select
          value={data.vehicleType}
          onChange={(e) => setData({ ...data, vehicleType: e.target.value })}
          required
        >
          <option value="">Jenis Kendaraan</option>
          <option value="Roda 2">Roda 2</option>
          <option value="Roda 4">Roda 4</option>
        </select>
        <input
          type="text"
          placeholder="Nomor Polisi"
          value={data.plateNumber}
          onChange={(e) => setData({ ...data, plateNumber: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Merk"
          value={data.brand}
          onChange={(e) => setData({ ...data, brand: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Warna"
          value={data.color}
          onChange={(e) => setData({ ...data, color: e.target.value })}
          required
        />
      </>
    )}

    <button type="button" onClick={onGetLocation}>
      Gunakan Lokasi Saat Ini
    </button>
    <input
      type="text"
      placeholder="Lokasi"
      value={data.location ? `${data.location.lat}, ${data.location.lng}` : ""}
      readOnly
    />
    <button type="submit">Kirim Laporan</button>
  </form>
);

const RoadForm = ({ data, setData, onSubmit, onGetLocation }) => (
  <form onSubmit={onSubmit} className="content">
    <h2>Laporkan Jalan Rusak</h2>
    <input
      type="text"
      placeholder="Deskripsi"
      value={data.description}
      onChange={(e) => setData({ ...data, description: e.target.value })}
      required
    />
    <select
      value={data.severity}
      onChange={(e) => setData({ ...data, severity: e.target.value })}
    >
      <option value="ringan">Ringan</option>
      <option value="sedang">Sedang</option>
      <option value="parah">Parah</option>
    </select>
    <button type="button" onClick={onGetLocation}>
      Gunakan Lokasi Saat Ini
    </button>
    <input
      type="text"
      placeholder="Lokasi"
      value={data.location ? `${data.location.lat}, ${data.location.lng}` : ""}
      readOnly
    />
    <button type="submit">Kirim Laporan</button>
  </form>
);

export default UserDashboard;
