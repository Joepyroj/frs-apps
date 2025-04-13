import React, { useState, useEffect, useCallback } from "react";
import { db } from "../config/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  addDoc,
 
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
// !! PENTING: Pastikan impor CSS sesuai dengan file yang Anda gunakan untuk layout ini
// import "./AdminDashboardOverlay.css"; // Gunakan nama file CSS yang sesuai
import "./AdminDashboard.css"; // <-- Ganti jika nama file CSS Anda berbeda

const AdminDashboard = () => {
  // State untuk UI & Kontrol
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState(null);
  const [activeStationSubSection, setActiveStationSubSection] = useState(null); // State untuk sub-bagian stasiun
  const [loadingSection, setLoadingSection] = useState(false);
  const [errorSection, setErrorSection] = useState(null);

  // State untuk Data User Admin
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  // State untuk Data Admin
  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]); // State ini akan menyimpan daftar user pending
  const [policeStations, setPoliceStations] = useState([]);
  const [newStation, setNewStation] = useState({ name: "", address: "", lat: "", lng: "" });

  // --- Fetch User Admin Saat Ini ---
  const fetchCurrentAdminData = useCallback(async (userId) => {
    setLoadingUser(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
        setUserName(userDocSnap.data().name || "Admin");
      } else {
        setUserName("Admin");
        console.warn("User logged in is not an admin or data missing.");
      }
    } catch (error) {
      console.error("Error fetching admin user data:", error);
      setUserName("Admin");
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // --- Fetch Data Pending Users (Dipanggil saat mount & refresh) ---
  const fetchPendingUsers = useCallback(async (showLoading = false) => {
    if (showLoading) setLoadingSection(true);
    // Hanya reset error jika memang diminta show loading (bukan background check)
    if (showLoading) setErrorSection(null);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const pending = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter: (belum diverifikasi ATAU field tidak ada) DAN (punya data profil) DAN (bukan admin saat ini)
        if ((data.verified === false || typeof data.verified === 'undefined') &&
            (data.nama && data.noKTP && data.alamat) &&
            (doc.id !== currentUserId) )
        {
             pending.push({ id: doc.id, ...data });
        }
      });
      console.log("Fetched pending users:", pending.length); // Debug
      setPendingUsers(pending); // Update state dengan daftar user pending
    } catch (error) {
      console.error("Error fetching pending users:", error);
      if (showLoading) setErrorSection(`Gagal mengambil data pengguna untuk verifikasi.`);
    } finally {
      if (showLoading) setLoadingSection(false);
    }
  }, [currentUserId]); // Dependensi pada currentUserId

  // --- Fetch Daftar Stasiun Polisi ---
  const fetchPoliceStations = useCallback(async () => {
    // Anda bisa menambahkan state loading khusus stasiun jika perlu
    // setLoadingSection(true);
    // setErrorSection(null);
    try {
      const stationsRef = collection(db, "policeStations");
      const snapshot = await getDocs(stationsRef);
      const stationList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPoliceStations(stationList);
    } catch (err) {
      console.error("Gagal mengambil data kantor polisi:", err);
      // setErrorSection("Gagal mengambil data kantor polisi."); // Set error jika perlu
    } finally {
      // setLoadingSection(false);
    }
  }, []);


  // --- Listener Auth State & Fetch Data Awal ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Hanya fetch jika user berubah atau ID belum ada
        if (user.uid !== currentUserId) {
            console.log("Auth state changed: User logged in", user.uid);
            setCurrentUserId(user.uid);
            fetchCurrentAdminData(user.uid);
            fetchPendingUsers(false); // PENTING: Fetch jumlah pending di background
            fetchPoliceStations(); // PENTING: Fetch stasiun di awal
        }
      } else {
        console.log("Auth state changed: User logged out");
        // Reset semua state jika logout
        setCurrentUserId(null); setUserName(""); setLoadingUser(false);
        setIsSidebarOpen(false); setActiveAdminSection(null); setActiveStationSubSection(null);
        setAllUsers([]); setPendingUsers([]); setPoliceStations([]);
      }
    });
    // Cleanup listener saat komponen unmount
    return () => {
        console.log("Cleaning up auth listener");
        unsubscribe();
    }
  
  }, [currentUserId, fetchCurrentAdminData, fetchPendingUsers, fetchPoliceStations]); // Tambah dependensi fetch

  // --- Fungsi Fetch Lainnya ---
  const fetchAllUsers = useCallback(async () => {
    setLoadingSection(true); setErrorSection(null);
    try {
      const usersRef = collection(db, "users");
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAllUsers(usersData);
    } catch (error) {
      console.error("Error fetching all users:", error);
      setErrorSection("Gagal mengambil data semua pengguna.");
    } finally { setLoadingSection(false); }
  }, []);

  // --- Fungsi Buka Sidebar & Fetch Data Sesuai Section ---
  const openAdminSidebar = useCallback((sectionType, subSection = null) => {
    console.log(`ADMIN: Membuka sidebar untuk section: ${sectionType}, sub: ${subSection}`);
    setActiveAdminSection(sectionType);
    setActiveStationSubSection(subSection);
    setIsSidebarOpen(true);
    // Fetch data HANYA jika section dibuka (kecuali pending yg sudah di fetch awal)
    if (sectionType === 'manageUsers') fetchAllUsers();
    else if (sectionType === 'verifyUsers') fetchPendingUsers(true); // Fetch lagi dengan loading
    else if (sectionType === 'station') fetchPoliceStations(); // Fetch lagi (refresh)
  }, [fetchAllUsers, fetchPendingUsers, fetchPoliceStations]);

  // --- Fungsi Tutup Sidebar ---
  const closeAdminSidebar = () => {
    console.log("ADMIN: Menutup sidebar");
    setActiveAdminSection(null); setActiveStationSubSection(null); setIsSidebarOpen(false); setErrorSection(null);
  };

  // --- Handler Aksi Admin ---
  const updateUserRole = async (userId, newRole) => {
    if (userId === currentUserId) return alert("Anda tidak dapat mengubah peran Anda sendiri.");
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      setAllUsers(prevUsers => prevUsers.map(user => user.id === userId ? { ...user, role: newRole } : user));
      alert(`Peran berhasil diubah.`);
    } catch (error) { console.error("Error updating user role:", error); alert("Gagal memperbarui peran."); }
  };

  const verifyUser = async (userId, verificationStatus) => {
    const isVerified = verificationStatus === "verified";
    const confirmationMessage = `${isVerified ? 'Verifikasi' : 'Tolak'} pengguna ID: ${userId}?`;
    if (window.confirm(confirmationMessage)) {
      try {
        await updateDoc(doc(db, "users", userId), { verified: isVerified, verificationStatus: verificationStatus, verificationTimestamp: Timestamp.now() });
        fetchPendingUsers(true); // Refresh daftar pending di sidebar (dengan loading)
        alert(`Status verifikasi berhasil diubah.`);
      } catch (error) { console.error("Error updating user verification status:", error); alert("Gagal memperbarui status verifikasi."); }
    }
  };

  const handleAddStation = async (e) => {
    e.preventDefault();
    const { name, address, lat, lng } = newStation;
    if (!name || !address || !lat || !lng) return alert("Harap isi semua kolom.");
    const latitude = parseFloat(lat); const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) return alert("Latitude/Longitude harus angka.");
    setLoadingSection(true); setErrorSection(null);
    try {
      await addDoc(collection(db, "policeStations"), { name, address, location: { lat: latitude, lng: longitude }, addedAt: Timestamp.now() });
      setNewStation({ name: "", address: "", lat: "", lng: "" }); // Reset form
      alert("Stasiun berhasil ditambahkan.");
      fetchPoliceStations(); // Refresh daftar
      setActiveStationSubSection('list'); // Pindah ke daftar
    } catch (err) { console.error("Gagal menyimpan kantor polisi:", err); setErrorSection("Gagal menyimpan data."); alert("Gagal menyimpan stasiun."); }
    finally { setLoadingSection(false); }
  };

  // --- Render Komponen ---
  return (
    <div className={`admin-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Kontainer Peta Fullscreen */}
      <div className="map-container-fullscreen">
        <MapComponent policeStations={policeStations} />
      </div>

      {/* Kontrol Overlay di Atas Peta */}
      <div className="overlay-controls">
        {!isSidebarOpen && (
          <span className="user-greeting-overlay">
            {loadingUser ? "Memuat..." : `Halo, ${userName}`} (Admin)
          </span>
        )}
        <button onClick={() => openAdminSidebar('manageUsers')} className="control-button-overlay" title="Kelola Peran Pengguna">
          <span role="img" aria-label="manage users">👥</span> Manage Users
        </button>

        {/* Tombol Verifikasi User dengan Notifikasi */}
        <button
          onClick={() => openAdminSidebar('verifyUsers')}
          // Kelas blinking ditambahkan jika ada pending users & sidebar TERTUTUP
          className={`control-button-overlay ${pendingUsers.length > 0 && !isSidebarOpen ? 'blinking' : ''}`}
          title="Verifikasi Pengguna Baru"
        >
          <span role="img" aria-label="verify users">✔️</span> Verifikasi User
           {/* Badge angka ditampilkan jika ada pending users & sidebar TERTUTUP */}
           {pendingUsers.length > 0 && !isSidebarOpen && (
             <span className="notification-badge">{pendingUsers.length}</span>
           )}
        </button>
        {/* Akhir Tombol Verifikasi */}

        <button onClick={() => openAdminSidebar('station', 'add')} className="control-button-overlay" title="Input Data Stasiun Polisi Baru">
          <span role="img" aria-label="add station">➕</span> Add Station
        </button>
        <button onClick={() => openAdminSidebar('station', 'list')} className="control-button-overlay" title="Lihat Daftar Stasiun Polisi">
          <span role="img" aria-label="list stations">🏢</span> Station List
        </button>
      </div>

      {/* Sidebar Geser */}
      <div className="sidebar-overlay">
        <div className="sidebar-admin-content">
          {/* Header Sidebar */}
          <div className="admin-sidebar-header">
            {activeAdminSection === 'manageUsers' && <h2>Manage User Roles</h2>}
            {activeAdminSection === 'verifyUsers' && <h2>Verifikasi Pengguna ({pendingUsers.length})</h2>}
            {activeAdminSection === 'station' && <h2>Police Station</h2>}
            <button className="close-sidebar-btn" onClick={closeAdminSidebar} title="Tutup">×</button>
          </div>

          {/* Konten Body Sidebar */}
          <div className="admin-sidebar-body">
            {loadingSection && <div className="loading-message">Memuat data...</div>}
            {errorSection && <div className="error-message">{errorSection}</div>}
            {!loadingSection && !errorSection && (
              <>
                {/* --- Konten Manage Users --- */}
                {activeAdminSection === 'manageUsers' && (
                   <div className="admin-section-content manage-users-table">
                     <table>
                       <thead><tr><th>Nama</th><th>Email</th><th>Peran</th></tr></thead>
                       <tbody>{allUsers.map((user) => ( <tr key={user.id}> <td>{user.name || user.nama || "-"}</td><td>{user.email}</td> <td> <select value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)} disabled={user.id === currentUserId}> <option value="user">User</option><option value="polisi">Polisi</option><option value="dinasPU">Dinas PU</option><option value="admin">Admin</option> </select> </td> </tr> ))}</tbody>
                     </table>
                   </div>
                )}
                {/* --- Konten Verifikasi User --- */}
                {activeAdminSection === 'verifyUsers' && (
                  <div className="admin-section-content verification-list">
                    {pendingUsers.length === 0 ? (<p className="empty-message">Tidak ada pengguna menunggu verifikasi.</p>) : ( pendingUsers.map((user) => ( <div key={user.id} className="verification-card-sidebar"> <div className="user-info"> <h3>{user.nama || user.name || "-"}</h3> <p><strong>Email:</strong> {user.email || "-"}</p> <p><strong>KTP:</strong> {user.noKTP || "-"}</p> <p><strong>Alamat:</strong> {user.alamat || "-"}</p> </div> <div className="verification-actions"> <button className="verify-button" onClick={() => verifyUser(user.id, "verified")}>Verifikasi</button> <button className="deny-button" onClick={() => verifyUser(user.id, "denied")}>Tolak</button> </div> </div> )) )}
                    <button onClick={() => fetchPendingUsers(true)} className="refresh-button" style={{marginTop: '15px'}}>Refresh Daftar Verifikasi</button>
                  </div>
                )}
                {/* --- Konten Manajemen Stasiun --- */}
                {activeAdminSection === 'station' && (
                  <div className="admin-section-content station-management-section">
                    {/* Navigasi Sub-bagian */}
                    <div className="station-subnav">
                        <button onClick={() => setActiveStationSubSection('add')} className={activeStationSubSection === 'add' ? 'active' : ''}>Tambah Stasiun</button>
                        <button onClick={() => setActiveStationSubSection('list')} className={activeStationSubSection === 'list' ? 'active' : ''}>Daftar Stasiun</button>
                    </div>
                    {/* Konten Sub-bagian */}
                    {activeStationSubSection === 'add' && (
                        <form onSubmit={handleAddStation} className="add-station-form-sidebar">
                            <h4>Tambah Stasiun Baru</h4>
                            <input type="text" placeholder="Nama Kantor Polisi" value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} required />
                            <input type="text" placeholder="Alamat Lengkap" value={newStation.address} onChange={(e) => setNewStation({ ...newStation, address: e.target.value })} required />
                            <div className="latlng-inputs">
                              <input type="text" placeholder="Latitude (e.g., -7.123)" value={newStation.lat} onChange={(e) => setNewStation({ ...newStation, lat: e.target.value })} required />
                              <input type="text" placeholder="Longitude (e.g., 112.456)" value={newStation.lng} onChange={(e) => setNewStation({ ...newStation, lng: e.target.value })} required />
                            </div>
                            <button type="submit" className="submit-station-btn" disabled={loadingSection}>{loadingSection ? 'Menyimpan...' : 'Simpan Stasiun'}</button>
                        </form>
                    )}
                    {activeStationSubSection === 'list' && (
                         <div className="station-list-sidebar">
                            {policeStations.length === 0 ? ( <p className="empty-message">Belum ada data stasiun.</p> ) : ( <ul>{policeStations.map((station) => (<li key={station.id}><strong>{station.name}</strong><br/>{station.address}<br/>({station.location?.lat.toFixed(5)}, {station.location?.lng.toFixed(5)})</li>))}</ul> )}
                            <button onClick={() => fetchPoliceStations()} className="refresh-button" style={{marginTop: '15px'}}>Refresh List</button>
                        </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div> {/* Akhir admin-sidebar-body */}
        </div> {/* Akhir sidebar-admin-content */}
      </div> {/* Akhir sidebar-overlay */}
    </div> // Akhir admin-dashboard-overlay
  );
};

export default AdminDashboard;