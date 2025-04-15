import React, { useEffect, useState, useCallback } from "react";
import { db } from "../config/firebaseConfig";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
  doc,
  getDoc,
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import MapComponent from "./MapComponent";
// Pastikan impor CSS benar
import "./PolisiDashboard.css"; // <-- Ganti jika nama file CSS Anda berbeda

const PolisiDashboard = () => {
  // State UI & Kontrol
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // State Data Laporan untuk SIDEBAR (Terpaginasi)
  const [sidebarCrimeReports, setSidebarCrimeReports] = useState([]); // Ganti nama state
  const [loadingSidebarReports, setLoadingSidebarReports] = useState(false); // Loading spesifik sidebar
  const [errorSidebarReports, setErrorSidebarReports] = useState(null); // Error spesifik sidebar
  const [lastVisibleSidebar, setLastVisibleSidebar] = useState(null); // Last visible untuk sidebar
  const [currentPageSidebar, setCurrentPageSidebar] = useState(1); // Current page untuk sidebar
  const [hasMoreSidebar, setHasMoreSidebar] = useState(false); // Has more untuk sidebar
  // State Data Laporan untuk PETA (Semua Data)
  const [mapCrimeReports, setMapCrimeReports] = useState([]); // State BARU untuk marker peta
  const [loadingMapReports, setLoadingMapReports] = useState(true); // Loading untuk data peta

  // State User Polisi
  const [loadingUser, setLoadingUser] = useState(true);
  const [userName, setUserName] = useState("");

  // --- useEffect: Mengambil data user saat komponen mount --- (Tetap sama)
  useEffect(() => {
    const auth = getAuth();
    setLoadingUser(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          // Pastikan user adalah polisi atau admin untuk keamanan tambahan jika perlu
          if (userDocSnap.exists() && (userDocSnap.data().role === 'polisi' || userDocSnap.data().role === 'admin')) {
            setUserName(userDocSnap.data().name || `Petugas ${user.uid.substring(0,5)}`);
          } else {
             setUserName(`Petugas ${user.uid.substring(0,5)}`); // Fallback atau handle non-polisi
             console.warn("User logged in might not be police/admin role.");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName("Petugas");
        } finally {
          setLoadingUser(false);
        }
      } else {
        setUserName("");
        setLoadingUser(false);
        // Redirect ke login jika perlu
      }
    });
    return () => unsubscribe();
  }, []);

  // --- useCallback: Fungsi fetch laporan untuk SIDEBAR (Terpaginasi) ---
  const fetchSidebarReports = useCallback(async (page = 1, startAfterDoc = null) => {
    setLoadingSidebarReports(true);
    setErrorSidebarReports(null);
    console.log(`SIDEBAR: Fetching page ${page}, starting after:`, startAfterDoc);
    try {
      let q = query(
        collection(db, "crime_reports"),
        orderBy("timestamp", "desc"),
        limit(10) // Limit untuk paginasi sidebar
      );
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const newLastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      console.log(`SIDEBAR: Fetched ${data.length} reports for page ${page}`);
      setSidebarCrimeReports(prev => page === 1 ? data : [...prev, ...data]); // Update state sidebar
      setHasMoreSidebar(snap.docs.length === 10);
      setLastVisibleSidebar(newLastVisible);
      setCurrentPageSidebar(page);
    } catch (err) {
      console.error("Error fetching sidebar crime reports:", err);
      setErrorSidebarReports("Gagal memuat data laporan kejahatan.");
      setSidebarCrimeReports([]);
    } finally {
      setLoadingSidebarReports(false);
    }
  }, []); // Dependensi kosong

  // --- useCallback: Fungsi fetch SEMUA laporan untuk PETA ---
  const fetchAllMapReports = useCallback(async () => {
    setLoadingMapReports(true);
    console.log("MAP: Fetching all crime reports for map START..."); // <-- Tambahkan log awal
    try {
      const q = query(collection(db, "crime_reports"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const allData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log(`MAP: Fetched ${allData.length} reports. Sample data:`, allData[0]); // <-- Tambahkan log hasil & sample
      setMapCrimeReports(allData);
    } catch (err) {
      console.error("MAP: Error fetching all crime reports:", err); // <-- Log jika error
      setMapCrimeReports([]);
    } finally {
      setLoadingMapReports(false);
      console.log("MAP: Fetching all crime reports END."); // <-- Tambahkan log akhir
    }
  }, []); // Dependensi kosong


  // --- useEffect: Fetch data awal untuk PETA saat komponen mount ---
  useEffect(() => {
    console.log("PolisiDashboard mounted, fetching initial map data...");
    fetchAllMapReports(); // Panggil fetch untuk peta
  }, [fetchAllMapReports]); // Dependensi ke fungsi fetch peta

  // --- useEffect: Fetch laporan awal untuk SIDEBAR saat dibuka ---
  useEffect(() => {
    // Hanya fetch jika sidebar dibuka DAN belum ada laporan di sidebar
    if (isSidebarOpen && sidebarCrimeReports.length === 0) {
      console.log("Sidebar opened, fetching initial sidebar reports...");
      fetchSidebarReports(1, null); // Panggil fetch untuk sidebar
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, fetchSidebarReports]); // Dependensi ke state sidebar dan fetch sidebar

  // --- Fungsi Load More untuk SIDEBAR ---
  const loadMoreSidebarReports = () => {
    if (hasMoreSidebar && !loadingSidebarReports && lastVisibleSidebar) {
      console.log("Loading more sidebar reports...");
      fetchSidebarReports(currentPageSidebar + 1, lastVisibleSidebar);
    } else if (!hasMoreSidebar) {
        console.log("No more sidebar reports to load.");
    }
  };

  // --- Fungsi Toggle Sidebar --- (Sama)
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  console.log("PolisiDashboard Rendering: mapCrimeReports state contains:", mapCrimeReports); // <-- Log state sebelum render

  // --- Render Komponen ---
  return (
    <div className={`polisi-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Kontainer Peta */}
      <div className="map-container-fullscreen">
        {/* Kirim data SEMUA laporan ke MapComponent */}
        <MapComponent
            crimeReports={mapCrimeReports} // <-- KIRIM DATA PETA
            roadReports={[]} // Kirim data jalan rusak jika ada state-nya
            // Kirim data stasiun polisi jika ada state-nya
        />
        {/* Tampilkan loading indicator untuk peta jika perlu */}
        {loadingMapReports && <div className="map-loading-indicator">Memuat Data Peta...</div>}
      </div>

      {/* Kontrol Overlay */}
      <div className="overlay-controls">
        {!isSidebarOpen && (
          <span className="user-greeting-overlay">
            {loadingUser ? "Memuat..." : `Halo, ${userName}`}
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className={`control-button-overlay ${isSidebarOpen ? 'active' : ''}`}
          title={isSidebarOpen ? "Tutup Daftar Laporan" : "Buka Daftar Laporan"}
        >
          <span role="img" aria-label="police-siren">🚨</span> Tindakan Kejahatan
        </button>
      </div>

      {/* Sidebar */}
      <div className="sidebar-overlay">
        <div className="sidebar-report-content">
          {/* Header Sidebar */}
          <div className="report-header-sidebar">
            <h3>Laporan Kejahatan</h3>
            <button className="close-sidebar-button" onClick={toggleSidebar} title="Tutup">×</button>
          </div>
          {/* Daftar Laporan (menggunakan state sidebar) */}
          <div className="report-list-sidebar">
            {errorSidebarReports && <div className="error-message">{errorSidebarReports}</div>}
            {sidebarCrimeReports.length === 0 && !loadingSidebarReports && !errorSidebarReports && (
              <div className="empty-message">Tidak ada laporan kejahatan terbaru.</div>
            )}
            {/* Map data laporan DARI STATE SIDEBAR */}
            {sidebarCrimeReports.map((report) => (
              <div key={report.id} className="report-item-sidebar">
                <div className="report-title">{report.description || "Laporan tanpa deskripsi"}</div>
                {report.vehicleType && ( <div className="report-detail"> <span className="detail-label">Kendaraan:</span> {report.vehicleType} - {report.brand || ''} - {report.color || ''} </div> )}
                {report.plateNumber && ( <div className="report-detail"> <span className="detail-label">No. Polisi:</span> {report.plateNumber} </div> )}
                {report.location && ( <div className="report-detail"> <span className="detail-label">Lokasi:</span> {report.location.lat?.toFixed(5)}, {report.location.lng?.toFixed(5)} </div> )}
                <div className="report-timestamp"> {(report.timestamp?.toDate ? new Date(report.timestamp.toDate()) : new Date(report.timestamp || Date.now())).toLocaleString()} </div>
              </div>
            ))}
            {loadingSidebarReports && <div className="loading-message">Memuat laporan...</div>}
          </div>
          {/* Tombol Load More (menggunakan state sidebar) */}
          {hasMoreSidebar && !loadingSidebarReports && (
            <div className="load-more-container">
              <button onClick={loadMoreSidebarReports} className="load-more-button" disabled={loadingSidebarReports}>
                Muat Lebih Banyak
              </button>
            </div>
          )}
          {!hasMoreSidebar && sidebarCrimeReports.length > 0 && !loadingSidebarReports && (
               <div className="no-more-data-message">Semua laporan sudah ditampilkan.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolisiDashboard;