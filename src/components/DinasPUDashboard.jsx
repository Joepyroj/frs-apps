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
// !! PENTING: Pastikan impor CSS sesuai dengan file yang Anda gunakan untuk layout ini
import "./DinasPUDashboard.css"; // <-- Ganti jika nama file CSS Anda berbeda

const DinasPUDashboard = () => {
  // State UI & Kontrol
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // State Data Laporan JALAN RUSAK untuk SIDEBAR (Terpaginasi)
  const [sidebarRoadReports, setSidebarRoadReports] = useState([]);
  const [loadingSidebarReports, setLoadingSidebarReports] = useState(false);
  const [errorSidebarReports, setErrorSidebarReports] = useState(null);
  const [lastVisibleSidebar, setLastVisibleSidebar] = useState(null);
  const [currentPageSidebar, setCurrentPageSidebar] = useState(1);
  const [hasMoreSidebar, setHasMoreSidebar] = useState(false);
  // State Data Laporan JALAN RUSAK untuk PETA (Semua Data)
  const [mapRoadReports, setMapRoadReports] = useState([]);
  const [loadingMapReports, setLoadingMapReports] = useState(true);

  // State User Dinas PU
  const [loadingUser, setLoadingUser] = useState(true);
  const [userName, setUserName] = useState("");
  // const [currentUserId, setCurrentUserId] = useState(null); // <-- HAPUS BARIS INI

  // --- useEffect: Mengambil data user saat komponen mount ---
  useEffect(() => {
    const auth = getAuth();
    setLoadingUser(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // setCurrentUserId(user.uid); // <-- HAPUS BARIS INI
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          // Pastikan user adalah dinasPU atau admin
          if (userDocSnap.exists() && (userDocSnap.data().role === 'dinasPU' || userDocSnap.data().role === 'admin')) {
            setUserName(userDocSnap.data().name || `Petugas PU ${user.uid.substring(0,5)}`);
          } else {
             setUserName(`Petugas PU ${user.uid.substring(0,5)}`); // Fallback
             console.warn("User logged in might not be Dinas PU/admin role.");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName("Petugas PU");
        } finally {
          setLoadingUser(false);
        }
      } else {
        // setCurrentUserId(null); // <-- HAPUS BARIS INI (jika ada)
        setUserName("");
        setLoadingUser(false);
        // Redirect ke login jika perlu
      }
    });
    return () => unsubscribe();
  }, []); // Dependensi kosong agar hanya run sekali

  // --- useCallback: Fungsi fetch laporan JALAN RUSAK untuk SIDEBAR (Terpaginasi) ---
  const fetchSidebarRoadReports = useCallback(async (page = 1, startAfterDoc = null) => {
    setLoadingSidebarReports(true);
    setErrorSidebarReports(null);
    console.log(`SIDEBAR (Road): Fetching page ${page}, starting after:`, startAfterDoc);
    try {
      let q = query(collection(db, "road_reports"), orderBy("timestamp", "desc"), limit(10));
      if (startAfterDoc) q = query(q, startAfter(startAfterDoc));
      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const newLastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
      console.log(`SIDEBAR (Road): Fetched ${data.length} reports for page ${page}`);
      setSidebarRoadReports(prev => page === 1 ? data : [...prev, ...data]);
      setHasMoreSidebar(snap.docs.length === 10);
      setLastVisibleSidebar(newLastVisible);
      setCurrentPageSidebar(page);
    } catch (err) {
      console.error("Error fetching sidebar road reports:", err);
      setErrorSidebarReports("Gagal memuat data laporan jalan rusak.");
      setSidebarRoadReports([]);
    } finally {
      setLoadingSidebarReports(false);
    }
  }, []);

  // --- useCallback: Fungsi fetch SEMUA laporan JALAN RUSAK untuk PETA ---
  const fetchAllMapRoadReports = useCallback(async () => {
    setLoadingMapReports(true);
    console.log("MAP (Road): Fetching all road reports for map START...");
    try {
      const q = query(collection(db, "road_reports"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      const allData = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log(`MAP (Road): Fetched ${allData.length} reports.`);
      setMapRoadReports(allData);
    } catch (err) {
      console.error("MAP (Road): Error fetching all road reports:", err);
      setMapRoadReports([]);
    } finally {
      setLoadingMapReports(false);
      console.log("MAP (Road): Fetching all road reports END.");
    }
  }, []);


  // --- useEffect: Fetch data awal untuk PETA saat komponen mount ---
  useEffect(() => {
    console.log("DinasPUDashboard mounted, fetching initial map data...");
    fetchAllMapRoadReports();
  }, [fetchAllMapRoadReports]);

  // --- useEffect: Fetch laporan awal untuk SIDEBAR saat dibuka ---
  useEffect(() => {
    if (isSidebarOpen && sidebarRoadReports.length === 0) {
      console.log("Sidebar opened, fetching initial sidebar road reports...");
      fetchSidebarRoadReports(1, null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, fetchSidebarRoadReports]);

  // --- Fungsi Load More untuk SIDEBAR ---
  const loadMoreSidebarReports = () => {
    if (hasMoreSidebar && !loadingSidebarReports && lastVisibleSidebar) {
      console.log("Loading more sidebar road reports...");
      fetchSidebarRoadReports(currentPageSidebar + 1, lastVisibleSidebar);
    } else if (!hasMoreSidebar) {
      console.log("No more sidebar road reports to load.");
    }
  };

  // --- Fungsi Toggle Sidebar ---
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // --- Render Komponen ---
  return (
    <div className={`dinaspu-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      <div className="map-container-fullscreen">
        <MapComponent
            roadReports={mapRoadReports}
            crimeReports={[]}
            policeStations={[]}
        />
        {loadingMapReports && <div className="map-loading-indicator">Memuat Data Peta...</div>}
      </div>
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
          <span role="img" aria-label="road damage">🚧</span> Laporan Jalan Rusak
        </button>
      </div>
      <div className="sidebar-overlay">
        <div className="sidebar-report-content">
          <div className="report-header-sidebar">
            <h3>Laporan Jalan Rusak</h3>
            <button className="close-sidebar-button" onClick={toggleSidebar} title="Tutup">×</button>
          </div>
          <div className="report-list-sidebar">
            {errorSidebarReports && <div className="error-message">{errorSidebarReports}</div>}
            {sidebarRoadReports.length === 0 && !loadingSidebarReports && !errorSidebarReports && (
              <div className="empty-message">Tidak ada laporan jalan rusak terbaru.</div>
            )}
            {sidebarRoadReports.map((report) => (
              <div key={report.id} className="report-item-sidebar">
                <div className="report-detail"><span className="detail-label">Deskripsi:</span> {report.description || "-"}</div>
                <div className="report-detail"><span className="detail-label">Lokasi:</span> {report.location?.lat ? `${report.location.lat.toFixed(5)}, ${report.location.lng.toFixed(5)}` : '-'}{report.streetName && report.streetName !== "N/A" && ` (${report.streetName})`}</div>
                <div className="report-detail"><span className="detail-label">Tingkat:</span> {report.severity || "-"}</div>
                <div className="report-detail"><span className="detail-label">Pelapor:</span> {report.userName || report.userId?.substring(0,5) || "-"}</div>
                <div className="report-timestamp">{(report.timestamp?.toDate ? new Date(report.timestamp.toDate()) : new Date(report.timestamp || Date.now())).toLocaleString()}</div>
              </div>
            ))}
            {loadingSidebarReports && <div className="loading-message">Memuat laporan...</div>}
          </div>
          {hasMoreSidebar && !loadingSidebarReports && (
            <div className="load-more-container">
              <button onClick={loadMoreSidebarReports} className="load-more-button" disabled={loadingSidebarReports}>Muat Lebih Banyak</button>
            </div>
          )}
          {!hasMoreSidebar && sidebarRoadReports.length > 0 && !loadingSidebarReports && (
               <div className="no-more-data-message">Semua laporan sudah ditampilkan.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DinasPUDashboard;