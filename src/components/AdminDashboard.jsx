import React, { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "../config/firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  Timestamp,
  addDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  // State untuk UI & Kontrol
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeAdminSection, setActiveAdminSection] = useState(null); // 'manageUsers', 'verifyUsers', 'station', 'reports'
  const [loadingSection, setLoadingSection] = useState(false);
  const [errorSection, setErrorSection] = useState(null);

  // --- Pisahkan state untuk sub-section ---
  const [activeStationSubSection, setActiveStationSubSection] = useState('add'); // Default ke 'add' saat section 'station' dibuka
  const [activeReportSubSection, setActiveReportSubSection] = useState('crime'); // Default ke 'crime' saat section 'reports' dibuka

  // State untuk Data User Admin
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userName, setUserName] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  // State untuk Data Admin
  const [allUsers, setAllUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [newStation, setNewStation] = useState({ name: "", address: "", lat: "", lng: "" });
  const [crimeReports, setCrimeReports] = useState([]);
  const [roadReports, setRoadReports] = useState([]);


  // --- Fetch User Admin Saat Ini ---
  const fetchCurrentAdminData = useCallback(async (userId) => {
    setLoadingUser(true);
    try {
      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
        setUserName(userDocSnap.data().name || "Admin");
      } else {
        setUserName("Admin (Role Missing?)"); // Lebih jelas
        console.warn("User logged in is not an admin or data missing.");
      }
    } catch (error) {
      console.error("Error fetching admin user data:", error);
      setUserName("Admin (Error)");
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // --- Fetch Data Pending Users ---
  const fetchPendingUsers = useCallback(async (showLoading = false) => {
    if (showLoading) { setLoadingSection(true); setErrorSection(null); }
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const pending = querySnapshot.docs.filter(doc => {
          const data = doc.data();
          // Cek semua kondisi dengan aman
          return (data.verified === false || typeof data.verified === 'undefined') &&
                 data.nama && data.noKTP && data.alamat && // Pastikan data profil ada
                 doc.id !== currentUserId;
      }).map(doc => ({ id: doc.id, ...doc.data() })); // Map setelah filter

      console.log("Fetched pending users:", pending.length);
      setPendingUsers(pending);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      if (showLoading) setErrorSection(`Gagal mengambil data pengguna untuk verifikasi.`);
    } finally {
      if (showLoading) setLoadingSection(false);
    }
  }, [currentUserId]);

  // --- Fetch Daftar Stasiun Polisi ---
  const fetchPoliceStations = useCallback(async (showLoading = false) => {
     if (showLoading) { setLoadingSection(true); setErrorSection(null); }
    try {
      const stationsRef = collection(db, "policeStations");
      const snapshot = await getDocs(stationsRef);
      const stationList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPoliceStations(stationList);
    } catch (err) {
      console.error("Gagal mengambil data kantor polisi:", err);
       if (showLoading) setErrorSection("Gagal memuat daftar stasiun.");
    } finally {
        if (showLoading) setLoadingSection(false);
    }
  }, []);

  // --- Fetch Data Laporan ---
  const fetchCrimeReports = useCallback(async (showLoading = false) => { // Ubah default ke false
    if (showLoading) { setLoadingSection(true); setErrorSection(null); }
    try {
      const reportsRef = collection(db, "crime_reports");
      const q = query(reportsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const reportList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setCrimeReports(reportList);
      console.log("Fetched crime reports:", reportList.length);
    } catch (err) {
      console.error("Gagal mengambil laporan kejahatan:", err);
      if (showLoading) setErrorSection("Gagal memuat laporan kejahatan.");
    } finally {
      if (showLoading) setLoadingSection(false);
    }
  }, []);

  const fetchRoadReports = useCallback(async (showLoading = false) => { // Ubah default ke false
     if (showLoading) { setLoadingSection(true); setErrorSection(null); }
    try {
      const reportsRef = collection(db, "road_reports");
      const q = query(reportsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      const reportList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setRoadReports(reportList);
      console.log("Fetched road reports:", reportList.length);
    } catch (err) {
      console.error("Gagal mengambil laporan jalan rusak:", err);
      if (showLoading) setErrorSection("Gagal memuat laporan jalan rusak.");
    } finally {
       if (showLoading) setLoadingSection(false);
    }
  }, []);

  // --- Listener Auth State & Fetch Data Awal ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.uid !== currentUserId) {
          console.log("Auth state changed: User logged in", user.uid);
          setCurrentUserId(user.uid);
          fetchCurrentAdminData(user.uid);
          fetchPendingUsers(false);
          fetchPoliceStations(false); // Fetch stasiun untuk peta saat load
        }
      } else {
        console.log("Auth state changed: User logged out");
        // Reset state
        setCurrentUserId(null); setUserName(""); setLoadingUser(false);
        setIsSidebarOpen(false); setActiveAdminSection(null);
        setActiveStationSubSection(null); setActiveReportSubSection(null); // Reset kedua sub-section
        setAllUsers([]); setPendingUsers([]); setPoliceStations([]);
        setCrimeReports([]); setRoadReports([]);
      }
    });
    return () => {
      console.log("Cleaning up auth listener");
      unsubscribe();
    }
  }, [currentUserId, fetchCurrentAdminData, fetchPendingUsers, fetchPoliceStations]); // Dependensi awal

  // --- Fetch Data Semua User ---
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


  // --- Fungsi Buka Sidebar ---
  const openAdminSidebar = useCallback((sectionType, subSection = null) => {
    console.log(`ADMIN: Membuka sidebar -> section: ${sectionType}, sub: ${subSection}`);
    setActiveAdminSection(sectionType);
    setIsSidebarOpen(true);
    setErrorSection(null); // Reset error setiap buka section baru

    // Reset sub-section yang tidak relevan
    setActiveStationSubSection(null);
    setActiveReportSubSection(null);

    // Fetch data sesuai section yang dibuka
    if (sectionType === 'manageUsers') {
      fetchAllUsers();
    } else if (sectionType === 'verifyUsers') {
      fetchPendingUsers(true); // Tampilkan loading saat buka section ini
    } else if (sectionType === 'station') {
        // Set default sub-section untuk station & fetch data
        const targetSubSection = subSection || 'add'; // Default ke 'add'
        setActiveStationSubSection(targetSubSection);
        fetchPoliceStations(true); // Tampilkan loading saat buka section ini
    } else if (sectionType === 'reports') {
        // Set default sub-section untuk reports & fetch data
        const targetSubSection = subSection || 'crime'; // Default ke 'crime'
        setActiveReportSubSection(targetSubSection);
        setLoadingSection(true); // Tampilkan loading umum
        Promise.all([fetchCrimeReports(false), fetchRoadReports(false)]) // Fetch tanpa set loading individual
            .catch(err => {
                console.error("Error fetching reports on open:", err);
                setErrorSection("Gagal memuat data laporan.");
            })
            .finally(() => {
                setLoadingSection(false); // Matikan loading umum
                // Pastikan sub-section tetap aktif setelah fetch
                setActiveReportSubSection(targetSubSection);
            });
    }
  }, [fetchAllUsers, fetchPendingUsers, fetchPoliceStations, fetchCrimeReports, fetchRoadReports]);


  // --- Fungsi Tutup Sidebar ---
  const closeAdminSidebar = () => {
    console.log("ADMIN: Menutup sidebar");
    setActiveAdminSection(null);
    setActiveStationSubSection(null);
    setActiveReportSubSection(null);
    setIsSidebarOpen(false);
    setErrorSection(null);
  };

  // --- Handler Aksi Admin ---
  const updateUserRole = async (userId, newRole) => {
    if (userId === currentUserId) return alert("Anda tidak dapat mengubah peran Anda sendiri.");
    // Konfirmasi tambahan
    if (!window.confirm(`Ubah peran user ID: ${userId} menjadi ${newRole}?`)) return;
    try {
      await updateDoc(doc(db, "users", userId), { role: newRole });
      // Update state lokal agar UI langsung berubah
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
        // Langsung update state pendingUsers di client-side untuk responsifitas
        setPendingUsers(prevPending => prevPending.filter(user => user.id !== userId));
        alert(`Status verifikasi berhasil diubah.`);
        // fetchPendingUsers(true); // Bisa juga fetch ulang, tapi filter client lebih cepat
      } catch (error) { console.error("Error updating user verification status:", error); alert("Gagal memperbarui status verifikasi."); }
    }
  };

   // Handler Add Station (jika masih dipakai)
  const handleAddStation = async (e) => {
    e.preventDefault();
    const { name, address, lat, lng } = newStation;
    if (!name || !address || !lat || !lng) return alert("Harap isi semua kolom.");
    const latitude = parseFloat(lat); const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) return alert("Latitude/Longitude harus angka.");
    setLoadingSection(true); setErrorSection(null);
    try {
      const docRef = await addDoc(collection(db, "policeStations"), { name, address, location: { lat: latitude, lng: longitude }, addedAt: Timestamp.now() });
      const newStationData = { id: docRef.id, name, address, location: { lat: latitude, lng: longitude }, addedAt: Timestamp.now() };
      setPoliceStations(prev => [...prev, newStationData]); // Update state lokal
      setNewStation({ name: "", address: "", lat: "", lng: "" }); // Reset form
      alert("Stasiun berhasil ditambahkan.");
      // fetchPoliceStations(false); // Fetch ulang di background jika perlu
      setActiveStationSubSection('list'); // Otomatis pindah ke daftar
    } catch (err) { console.error("Gagal menyimpan kantor polisi:", err); setErrorSection("Gagal menyimpan data."); alert("Gagal menyimpan stasiun."); }
    finally { setLoadingSection(false); }
  };


  // --- Fungsi ganti sub-bagian ---
  const changeStationSubSection = (subSection) => {
      if (activeStationSubSection === subSection) return;
      console.log(`Changing station sub-section to: ${subSection}`);
      setActiveStationSubSection(subSection);
      // Fetch ulang daftar stasiun jika pindah ke tab 'list'
      if(subSection === 'list') fetchPoliceStations(true);
  };

  const changeReportSubSection = (subSection) => {
      if (activeReportSubSection === subSection) return;
      console.log(`Changing report sub-section to: ${subSection}`);
      setActiveReportSubSection(subSection);
      // Fetch ulang laporan yang sesuai saat tab diganti
      if (subSection === 'crime') fetchCrimeReports(true);
      else if (subSection === 'road') fetchRoadReports(true);
  };


  // --- Tentukan marker untuk peta ---
  const mapMarkers = useMemo(() => {
    let crimes = [];
    let roads = [];
    const stations = policeStations; // Selalu ambil semua stasiun

    if (isSidebarOpen && activeAdminSection === 'reports') {
        if (activeReportSubSection === 'crime') crimes = crimeReports;
        else if (activeReportSubSection === 'road') roads = roadReports;
    }
    
    return { crimes, roads, stations };
  }, [isSidebarOpen, activeAdminSection, activeReportSubSection, crimeReports, roadReports, policeStations]);

  // --- Render Komponen ---
  return (
    // Pastikan tag pembuka div ini benar (L305 di error sebelumnya)
    <div className={`admin-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="map-container-fullscreen">
        <MapComponent
          policeStations={mapMarkers.stations}
          crimeReports={mapMarkers.crimes}
          roadReports={mapMarkers.roads}
        />
      </div>

      <div className="overlay-controls">
         {!isSidebarOpen && (
           <span className="user-greeting-overlay">
             {loadingUser ? "Memuat..." : `Halo, ${userName}`} (Admin)
           </span>
         )}
        <button onClick={() => openAdminSidebar('manageUsers')} className="control-button-overlay" title="Kelola Peran Pengguna">
          <span role="img" aria-label="manage users">👥</span> Manage Users
        </button>

        <button
          onClick={() => openAdminSidebar('verifyUsers')}
          className={`control-button-overlay ${pendingUsers.length > 0 && !isSidebarOpen ? 'blinking' : ''}`}
          title="Verifikasi Pengguna Baru"
        >
          <span role="img" aria-label="verify users">✔️</span> Verifikasi User
           {pendingUsers.length > 0 && !isSidebarOpen && (
             <span className="notification-badge">{pendingUsers.length}</span>
           )}
        </button>

        {/* Tombol Station (jika masih perlu) */}
         <button onClick={() => openAdminSidebar('station', 'add')} className="control-button-overlay" title="Manajemen Stasiun Polisi">
           <span role="img" aria-label="police station">🏢</span> Stasiun Polisi
         </button>

        <button
          onClick={() => openAdminSidebar('reports', 'crime')}
          className="control-button-overlay"
          title="Tampilkan Daftar Laporan"
        >
          <span role="img" aria-label="show reports">📋</span> Tampilkan Laporan
        </button>
      </div>

      <div className="sidebar-overlay">
        <div className="sidebar-admin-content">
          <div className="admin-sidebar-header">
             {/* Judul dinamis berdasarkan section aktif */}
             {activeAdminSection === 'manageUsers' && <h2>Manage User Roles</h2>}
             {activeAdminSection === 'verifyUsers' && <h2>Verifikasi Pengguna ({pendingUsers.length})</h2>}
             {activeAdminSection === 'station' && <h2>Manajemen Stasiun Polisi</h2>}
             {activeAdminSection === 'reports' && <h2>Daftar Laporan</h2>}
            <button className="close-sidebar-btn" onClick={closeAdminSidebar} title="Tutup">×</button>
          </div>

          <div className="admin-sidebar-body">
             {/* Tampilkan loading/error global HANYA jika section TIDAK ADA sub-navigasi loading sendiri */}
             {loadingSection && (activeAdminSection === 'manageUsers' || activeAdminSection === 'verifyUsers') && <div className="loading-message">Memuat data...</div>}
             {errorSection && (activeAdminSection === 'manageUsers' || activeAdminSection === 'verifyUsers') && <div className="error-message">{errorSection}</div>}

            {/* Bagian Konten Utama */}
            {/* Bagian Manage User */}
            {activeAdminSection === 'manageUsers' && !loadingSection && !errorSection && (
                 <div className="admin-section-content manage-users-table">
                   <table>
                     <thead><tr><th>Nama</th><th>Email</th><th>Peran</th></tr></thead>
                     <tbody>{allUsers.map((user) => ( <tr key={user.id}> <td>{user.name || user.nama || "-"}</td><td>{user.email}</td> <td> <select value={user.role} onChange={(e) => updateUserRole(user.id, e.target.value)} disabled={user.id === currentUserId}> <option value="user">User</option><option value="polisi">Polisi</option><option value="dinasPU">Dinas PU</option><option value="admin">Admin</option> </select> </td> </tr> ))}</tbody>
                   </table>
                 </div>
            )}

            {/* Bagian Verifikasi User */}
             {activeAdminSection === 'verifyUsers' && !loadingSection && !errorSection && (
               <div className="admin-section-content verification-list">
                 {pendingUsers.length === 0 ? (<p className="empty-message">Tidak ada pengguna menunggu verifikasi.</p>) : ( pendingUsers.map((user) => ( <div key={user.id} className="verification-card-sidebar"> <div className="user-info"> <h3>{user.nama || user.name || "-"}</h3> <p><strong>Email:</strong> {user.email || "-"}</p> <p><strong>KTP:</strong> {user.noKTP || "-"}</p> <p><strong>Alamat:</strong> {user.alamat || "-"}</p> </div> <div className="verification-actions"> <button className="verify-button" onClick={() => verifyUser(user.id, "verified")}>Verifikasi</button> <button className="deny-button" onClick={() => verifyUser(user.id, "denied")}>Tolak</button> </div> </div> )) )}
                 <button onClick={() => fetchPendingUsers(true)} className="refresh-button" style={{marginTop: '15px'}}>Refresh Daftar Verifikasi</button>
               </div>
             )}

            {/* Bagian Station */}
             {activeAdminSection === 'station' && (
               <div className="admin-section-content station-management-section">
                 <div className="station-subnav"> {/* Ganti nama class jika perlu */}
                    <button onClick={() => changeStationSubSection('add')} className={activeStationSubSection === 'add' ? 'active' : ''}>Tambah Stasiun</button>
                    <button onClick={() => changeStationSubSection('list')} className={activeStationSubSection === 'list' ? 'active' : ''}>Daftar Stasiun ({policeStations.length})</button>
                 </div>

                 {/* Tampilkan loading/error khusus section ini */}
                 {loadingSection && <div className="loading-message">Memuat...</div>}
                 {errorSection && <div className="error-message">{errorSection}</div>}

                 {/* Konten sub-section */}
                 {!loadingSection && !errorSection && (
                    <>
                        {activeStationSubSection === 'add' && (
                            <form onSubmit={handleAddStation} className="add-station-form-sidebar">
                                <h4>Tambah Stasiun Baru</h4>
                                <input type="text" placeholder="Nama Kantor Polisi" value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} required />
                                <input type="text" placeholder="Alamat Lengkap" value={newStation.address} onChange={(e) => setNewStation({ ...newStation, address: e.target.value })} required />
                                <div className="latlng-inputs">
                                <input type="text" placeholder="Latitude (e.g., -7.123)" value={newStation.lat} onChange={(e) => setNewStation({ ...newStation, lat: e.target.value })} required />
                                <input type="text" placeholder="Longitude (e.g., 112.456)" value={newStation.lng} onChange={(e) => setNewStation({ ...newStation, lng: e.target.value })} required />
                                </div>
                                <button type="submit" className="submit-station-btn">Simpan Stasiun</button>
                            </form>
                        )}
                        {activeStationSubSection === 'list' && (
                            <div className="station-list-sidebar">
                                {policeStations.length === 0 ? ( <p className="empty-message">Belum ada data stasiun.</p> ) : ( <ul>{policeStations.map((station) => (<li key={station.id}><strong>{station.name}</strong><br/>{station.address}<br/>({station.location?.lat.toFixed(5)}, {station.location?.lng.toFixed(5)})</li>))}</ul> )}
                                <button onClick={() => fetchPoliceStations(true)} className="refresh-button" style={{marginTop: '15px'}}>Refresh Daftar Stasiun</button>
                            </div>
                        )}
                    </>
                 )}
               </div>
             )}

            {/* Bagian Reports */}
            {activeAdminSection === 'reports' && (
              <div className="admin-section-content reports-section">
                <div className="report-subnav">
                  <button onClick={() => changeReportSubSection('crime')} className={activeReportSubSection === 'crime' ? 'active' : ''}>
                    Kejadian Kejahatan ({crimeReports.length})
                  </button>
                  <button onClick={() => changeReportSubSection('road')} className={activeReportSubSection === 'road' ? 'active' : ''}>
                    Laporan Jalan Rusak ({roadReports.length})
                  </button>
                </div>

                 {/* Tampilkan loading/error khusus section ini */}
                 {loadingSection && <div className="loading-message">Memuat laporan...</div>}
                 {errorSection && <div className="error-message">{errorSection}</div>}

                 {/* Konten sub-section */}
                 {!loadingSection && !errorSection && (
                    <div className="report-list-container">
                        {activeReportSubSection === 'crime' && (
                          <div className="report-list crime-report-list">
                            {crimeReports.length === 0 ? (
                              <p className="empty-message">Tidak ada laporan kejahatan.</p>
                            ) : (
                              <ul>{crimeReports.map((report) => ( <li key={report.id} className="report-item"> <strong>{report.description}</strong>{report.vehicleType && <span className="detail"> ({report.vehicleType} - {report.plateNumber})</span>}<br/><span className="detail">Pelapor: {report.userName || report.userId}</span><br/><span className="detail">Lokasi: {report.location?.lat.toFixed(4)}, {report.location?.lng.toFixed(4)}</span><br/><span className="timestamp">{(report.timestamp?.toDate ? new Date(report.timestamp.toDate()) : new Date()).toLocaleString()}</span> </li> ))}</ul>
                            )}
                            <button onClick={() => fetchCrimeReports(true)} className="refresh-button">Refresh Laporan Kejahatan</button>
                          </div>
                        )}
                        {activeReportSubSection === 'road' && (
                           <div className="report-list road-report-list">
                            {roadReports.length === 0 ? (
                              <p className="empty-message">Tidak ada laporan jalan rusak.</p>
                            ) : (
                              <ul>{roadReports.map((report) => ( <li key={report.id} className="report-item"> <strong>Jalan Rusak: {report.description}</strong><span className="detail"> (Tingkat: {report.severity})</span><br/><span className="detail">Pelapor: {report.userName || report.userId}</span><br/><span className="detail">Lokasi: {report.location?.lat.toFixed(4)}, {report.location?.lng.toFixed(4)}</span><br/><span className="timestamp">{(report.timestamp?.toDate ? new Date(report.timestamp.toDate()) : new Date()).toLocaleString()}</span> </li> ))}</ul>
                            )}
                             <button onClick={() => fetchRoadReports(true)} className="refresh-button">Refresh Laporan Jalan</button>
                          </div>
                        )}
                    </div> // Akhir report-list-container
                 )}
              </div> // Akhir reports-section
            )}

          </div> {/* Akhir admin-sidebar-body */}
        </div> {/* Akhir sidebar-admin-content */}
      </div> {/* Akhir sidebar-overlay */}
    </div> // Akhir admin-dashboard-overlay (INI TAG PENUTUP UTAMA)
  );
}; // Akhir Komponen AdminDashboard

export default AdminDashboard;