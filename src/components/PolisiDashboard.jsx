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
import "./PolisiDashboard.css"; 

const PolisiDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [crimeReports, setCrimeReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [errorReports, setErrorReports] = useState(null);
  const [lastVisible, setLastVisible] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userName, setUserName] = useState("");

  // --- useEffect: Mengambil data user saat komponen mount ---
  useEffect(() => {
    const auth = getAuth();
    setLoadingUser(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          setUserName(userDocSnap.exists() ? userDocSnap.data().name || "Pengguna Polisi" : "Pengguna Polisi");
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserName("Pengguna Polisi"); // Fallback jika error
        } finally {
          setLoadingUser(false);
        }
      } else {
        setUserName("");
        setLoadingUser(false);
        }
    });
    
    return () => unsubscribe();
  }, []); 

  // --- useCallback: Fungsi untuk mengambil data laporan kejahatan ---
  const fetchReports = useCallback(async (page = 1, startAfterDoc = null) => {
    setLoadingReports(true);
    setErrorReports(null);
    console.log(`Workspaceing page ${page}, starting after:`, startAfterDoc); // Debug log
    try {
      let q = query(
        collection(db, "crime_reports"),
        orderBy("timestamp", "desc"),
        limit(10) // Jumlah item per halaman
      );
      if (startAfterDoc) {
        q = query(q, startAfter(startAfterDoc));
      }

      const snap = await getDocs(q);
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const newLastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      console.log(`Workspaceed ${data.length} reports for page ${page}`); // Debug log

      setCrimeReports(prev => page === 1 ? data : [...prev, ...data]);
      setHasMore(snap.docs.length === 10); // Cek apakah ada halaman berikutnya
      setLastVisible(newLastVisible); // Simpan dokumen terakhir untuk halaman berikutnya
      setCurrentPage(page); // Update nomor halaman saat ini
    } catch (err) {
      console.error("Error fetching crime reports:", err);
      setErrorReports("Gagal memuat data laporan kejahatan.");
      setCrimeReports([]); // Kosongkan laporan jika terjadi error
    } finally {
      setLoadingReports(false);
    }
  }, []); 

  
  useEffect(() => {
    // Hanya fetch jika sidebar dibuka DAN belum ada laporan yang dimuat
    if (isSidebarOpen && crimeReports.length === 0) {
      console.log("Sidebar opened, fetching initial reports..."); // Debug log
      fetchReports(1, null);
    }
    // Komentar di bawah ini adalah contoh jika Anda ingin reset laporan saat sidebar ditutup
    // else if (!isSidebarOpen) {
    //   setCrimeReports([]);
    //   setCurrentPage(1);
    //   setLastVisible(null);
    //   setHasMore(false);
    // }

    // Mengabaikan peringatan ESLint untuk crimeReports.length karena penambahan
    // dependensi tersebut akan menyebabkan fetch ulang yang tidak diinginkan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSidebarOpen, fetchReports]); // Dependensi hanya pada isSidebarOpen dan fetchReports

  // --- Fungsi: Memuat lebih banyak laporan (Load More) ---
  const loadMoreReports = () => {
    if (hasMore && !loadingReports && lastVisible) {
      console.log("Loading more reports..."); // Debug log
      fetchReports(currentPage + 1, lastVisible);
    } else if (!hasMore) {
        console.log("No more reports to load."); // Debug log
    }
  };

  // --- Fungsi: Toggle visibilitas sidebar ---
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    // Wrapper utama, kelas 'sidebar-open' ditambahkan saat sidebar aktif
    <div className={`polisi-dashboard-overlay ${isSidebarOpen ? 'sidebar-open' : ''}`}>

      {/* Kontainer Peta (mengisi seluruh area) */}
      <div className="map-container-fullscreen">
        <MapComponent crimeReports={crimeReports} roadReports={[]} />
      </div>

      {/* Kontrol yang Overlay di atas Peta */}
      <div className="overlay-controls">
        {/* Salam Pengguna (Hanya tampil jika sidebar tertutup) */}
        {!isSidebarOpen && (
          <span className="user-greeting-overlay">
            {loadingUser ? "Memuat..." : `Halo, ${userName}`}
          </span>
        )}

        {/* Tombol Tindakan Kejahatan (Selalu tampil) */}
        <button
          onClick={toggleSidebar}
          className={`control-button-overlay ${isSidebarOpen ? 'active' : ''}`}
          title={isSidebarOpen ? "Tutup Daftar Laporan" : "Buka Daftar Laporan"}
        >
          <span role="img" aria-label="police-siren">🚨</span> Tindakan Kejahatan
        </button>
      </div>

      {/* Sidebar (Konten Laporan, overlay di kiri saat aktif) */}
      <div className="sidebar-overlay">
        {/* Konten di dalam sidebar */}
        <div className="sidebar-report-content">
          {/* Header Sidebar */}
          <div className="report-header-sidebar">
            <h3>Laporan Kejahatan</h3>
             {/* Tombol Close di dalam sidebar */}
             <button className="close-sidebar-button" onClick={toggleSidebar} title="Tutup">×</button>
          </div>
          {/* Daftar Laporan */}
          <div className="report-list-sidebar">
            {/* Tampilkan pesan error jika ada */}
            {errorReports && <div className="error-message">{errorReports}</div>}
            {/* Tampilkan pesan kosong jika tidak loading, tidak error, dan tidak ada laporan */}
            {crimeReports.length === 0 && !loadingReports && !errorReports && (
              <div className="empty-message">Tidak ada laporan kejahatan terbaru.</div>
            )}
            {/* Map data laporan ke item list */}
            {crimeReports.map((report) => (
              <div key={report.id} className="report-item-sidebar">
                 <div className="report-title">{report.description || "Laporan tanpa deskripsi"}</div>
                  {report.vehicleType && ( <div className="report-detail"> <span className="detail-label">Kendaraan:</span> {report.vehicleType} - {report.brand || ''} - {report.color || ''} </div> )}
                  {report.plateNumber && ( <div className="report-detail"> <span className="detail-label">No. Polisi:</span> {report.plateNumber} </div> )}
                  {report.location && ( <div className="report-detail"> <span className="detail-label">Lokasi:</span> {report.location.lat?.toFixed(5)}, {report.location.lng?.toFixed(5)} </div> )}
                  <div className="report-timestamp"> {(report.timestamp?.toDate ? new Date(report.timestamp.toDate()) : new Date(report.timestamp || Date.now())).toLocaleString()} </div>
              </div>
            ))}
             {/* Tampilkan indikator loading saat fetching */}
             {loadingReports && <div className="loading-message">Memuat laporan...</div>}
          </div>
          {/* Tombol Load More */}
          {hasMore && !loadingReports && (
            <div className="load-more-container">
              <button
                onClick={loadMoreReports}
                className="load-more-button"
                disabled={loadingReports} // Disable tombol saat sedang loading
              >
                Muat Lebih Banyak
              </button>
            </div>
          )}
           {/* Tampilkan pesan jika sudah tidak ada data lagi */}
          {!hasMore && crimeReports.length > 0 && !loadingReports && (
               <div className="no-more-data-message">Semua laporan sudah ditampilkan.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PolisiDashboard;