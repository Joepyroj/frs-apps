import React, { useState, useEffect } from "react";
import { dbfr } from "../config/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
import "./UserDashboard.css";

const UserDashboard = () => {
  const [activeForm, setActiveForm] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);

  // State untuk formulir profil
  const [profileData, setProfileData] = useState({
    nama: "",
    noKTP: "",
    alamat: "",
  });

  // State untuk laporan kejahatan
  const [crimeReport, setCrimeReport] = useState({ description: "", location: "" });

  // State untuk laporan jalan rusak
  const [roadReport, setRoadReport] = useState({ description: "", severity: "ringan" });

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchUserData(user.uid);
      }
    });
  }, []);

  const fetchUserData = async (userId) => {
    try {
      const userRef = doc(dbfr, "users", userId);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfileComplete(data.verified && data.noKTP && data.alamat);
        
        // Mengisi data profile jika sudah ada
        if (data.nama || data.noKTP || data.alamat) {
          setProfileData({
            nama: data.nama || "",
            noKTP: data.noKTP || "",
            alamat: data.alamat || ""
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  // Fungsi untuk menyimpan profil
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!profileData.nama || !profileData.noKTP || !profileData.alamat) {
        alert("Mohon lengkapi semua field.");
        return;
      }

      const userRef = doc(dbfr, "users", currentUserId);

      // Gunakan setDoc dengan opsi { merge: true }
      await setDoc(userRef, {
        nama: profileData.nama,
        noKTP: profileData.noKTP,
        alamat: profileData.alamat,
        verified: false,
      }, { merge: true }); // Opsi { merge: true } akan membuat dokumen jika belum ada

      alert("Data profil berhasil disimpan! Menunggu verifikasi admin.");
      setActiveForm(null);
      fetchUserData(currentUserId);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Terjadi kesalahan saat menyimpan data profil.");
    }
  };

  // Fungsi untuk melaporkan kejahatan
  const handleCrimeReport = async (e) => {
    e.preventDefault();
    try {
      const reportRef = doc(dbfr, "crime_reports", currentUserId);
      await setDoc(reportRef, {
        description: crimeReport.description,
        location: crimeReport.location,
        timestamp: new Date(),
      }, { merge: true });
      alert("Laporan kejahatan berhasil dikirim!");
      setCrimeReport({ description: "", location: "" }); // Reset state
      setActiveForm(null);
    } catch (error) {
      console.error("Error submitting crime report:", error);
    }
  };

  // Fungsi untuk melaporkan jalan rusak
  const handleRoadReport = async (e) => {
    e.preventDefault();
    try {
      const reportRef = doc(dbfr, "road_reports", currentUserId);
      await setDoc(reportRef, {
        description: roadReport.description,
        severity: roadReport.severity,
        timestamp: new Date(),
      }, { merge: true });
      alert("Laporan jalan rusak berhasil dikirim!");
      setRoadReport({ description: "", severity: "ringan" }); // Reset state
      setActiveForm(null);
    } catch (error) {
      console.error("Error submitting road report:", error);
    }
  };

  return (
    <div className="user-dashboard">
      {/* Area Hover agar sidebar muncul saat kursor mendekati */}
      <div className="sidebar-hover-area"></div>

      {/* Sidebar */}
      <div className="sidebar">
        <h2>Menu User</h2>
        <ul>
          <li onClick={() => setActiveForm("profile")}>Lengkapi Profil</li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("crime")}
          >
            Laporkan Kejadian Kejahatan
          </li>
          <li
            className={!profileComplete ? "disabled" : ""}
            onClick={() => profileComplete && setActiveForm("road")}
          >
            Laporkan Jalanan Rusak
          </li>
        </ul>
      </div>

      {/* Map Container */}
      <div className="map-container">
        <MapComponent />
        {!profileComplete && (
          <div className="warning">
            <h3>Silakan lengkapi profil terlebih dahulu untuk membuat laporan!</h3>
          </div>
        )}
        
        {/* Content - Sekarang di posisi atas */}
        {activeForm && (
          <div className="content">
            {/* Formulir Profil */}
            {activeForm === "profile" && (
              <form onSubmit={handleProfileSubmit}>
                <h2>Lengkapi Data Profil</h2>
                <input
                  type="text"
                  placeholder="Nama Sesuai KTP"
                  value={profileData.nama}
                  onChange={(e) =>
                    setProfileData({ ...profileData, nama: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Nomor KTP"
                  value={profileData.noKTP}
                  onChange={(e) =>
                    setProfileData({ ...profileData, noKTP: e.target.value })
                  }
                  required
                />
                <textarea
                  placeholder="Alamat Lengkap"
                  value={profileData.alamat}
                  onChange={(e) =>
                    setProfileData({ ...profileData, alamat: e.target.value })
                  }
                  required
                />
                <button type="submit">Simpan Profil</button>
              </form>
            )}

            {/* Formulir Laporan Kejahatan */}
            {activeForm === "crime" && (
              <form onSubmit={handleCrimeReport}>
                <h2>Laporkan Kejahatan</h2>
                <input
                  type="text"
                  placeholder="Deskripsi Kejahatan"
                  value={crimeReport.description}
                  onChange={(e) =>
                    setCrimeReport({ ...crimeReport, description: e.target.value })
                  }
                  required
                />
                <input
                  type="text"
                  placeholder="Lokasi"
                  value={crimeReport.location}
                  onChange={(e) =>
                    setCrimeReport({ ...crimeReport, location: e.target.value })
                  }
                  required
                />
                <button type="submit">Kirim Laporan</button>
              </form>
            )}

            {/* Formulir Laporan Jalan Rusak */}
            {activeForm === "road" && (
              <form onSubmit={handleRoadReport}>
                <h2>Laporkan Jalan Rusak</h2>
                <input
                  type="text"
                  placeholder="Deskripsi Jalan Rusak"
                  value={roadReport.description}
                  onChange={(e) =>
                    setRoadReport({ ...roadReport, description: e.target.value })
                  }
                  required
                />
                <select
                  value={roadReport.severity}
                  onChange={(e) =>
                    setRoadReport({ ...roadReport, severity: e.target.value })
                  }
                >
                  <option value="ringan">Ringan</option>
                  <option value="sedang">Sedang</option>
                  <option value="parah">Parah</option>
                </select>
                <button type="submit">Kirim Laporan</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;