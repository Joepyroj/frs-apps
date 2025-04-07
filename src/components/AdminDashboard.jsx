import React, { useState, useEffect } from "react";
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
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [policeStations, setPoliceStations] = useState([]);
  const [newStation, setNewStation] = useState({ name: "", lat: "", lng: "" });
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showPoliceForm, setShowPoliceForm] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        try {
          const profileRef = doc(db, "users", user.uid);
          const profileSnap = await getDoc(profileRef);
          if (profileSnap.exists()) {
            setCurrentUserRole(profileSnap.data().role);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setError("Gagal mengambil informasi peran pengguna");
        }
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
    });
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const usersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users:", error);
        setError("Gagal mengambil data pengguna");
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchPendingUsers = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const pending = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.verified === false || data.verified === undefined) {
            pending.push({ id: doc.id, ...data });
          }
        });
        setPendingUsers(pending);
      } catch (error) {
        console.error("❌ Error fetching pending users:", error);
        setError(`Gagal mengambil data pengguna: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserRole === "admin") {
      fetchPendingUsers();
    }
  }, [currentUserRole, showVerification]);

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const stationsRef = collection(db, "policeStations");
        const snapshot = await getDocs(stationsRef);
        const stationList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPoliceStations(stationList);
      } catch (err) {
        console.error("Gagal mengambil data kantor polisi:", err);
      }
    };

    if (currentUserRole === "admin") {
      fetchStations();
    }
  }, [currentUserRole, showPoliceForm]);

  const updateUserRole = async (userId, newRole) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, { role: newRole });
      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error("Error updating user role:", error);
      setError("Gagal memperbarui peran pengguna");
    }
  };

  const verifyUser = async (userId, verificationStatus) => {
    try {
      const profileRef = doc(db, "users", userId);
      await updateDoc(profileRef, {
        verified: verificationStatus === "verified",
        verifiedAt: verificationStatus === "verified" ? Timestamp.now() : null,
      });
      setPendingUsers(pendingUsers.filter((user) => user.id !== userId));
    } catch (error) {
      console.error("Error updating user verification status:", error);
      setError("Gagal memperbarui status verifikasi pengguna");
    }
  };

  const refreshPendingUsers = async () => {
    if (currentUserRole === "admin") {
      setError(null);
      setLoading(true);
      try {
        const usersRef = collection(db, "users");
        const querySnapshot = await getDocs(usersRef);
        const pending = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.verified === false || data.verified === undefined) {
            pending.push({ id: doc.id, ...data });
          }
        });
        setPendingUsers(pending);
      } catch (error) {
        console.error("❌ Error fetching pending users:", error);
        setError(`Gagal mengambil data pengguna: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };


  const handleAddStation = async (e) => {
    e.preventDefault();
    const { name, address, lat, lng } = newStation;
    if (!name || !address || !lat || !lng) {
      alert("Harap isi semua kolom.");
      return;
    }

    try {
      await addDoc(collection(db, "policeStations"), {
        name,
        address,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
      });
      setNewStation({ name: "", address: "", lat: "", lng: "" });
      alert("Data kantor polisi berhasil ditambahkan.");
    } catch (err) {
      console.error("Gagal menyimpan kantor polisi:", err);
      alert("Gagal menyimpan kantor polisi.");
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="sidebar-hover-area"></div>
      <div className="sidebar">
        <h2>Menu Admin</h2>
        <p>
          Peran Anda: <strong>{currentUserRole || "Memuat..."}</strong>
        </p>
        <ul>
          <li
            onClick={() => {
              setShowUserManagement(true);
              setShowVerification(false);
              setShowPoliceForm(false);
            }}
          >
            Kelola Peran Pengguna
          </li>
          <li
            onClick={() => {
              setShowVerification(true);
              setShowUserManagement(false);
              setShowPoliceForm(false);
              refreshPendingUsers();
            }}
          >
            Verifikasi Pengguna{" "}
            <span className="notification-badge">{pendingUsers.length}</span>
          </li>
          <li
            onClick={() => {
              setShowPoliceForm(true);
              setShowUserManagement(false);
              setShowVerification(false);
            }}
          >
            Input Kantor Polisi
          </li>
        </ul>
      </div>

      <div className="map-container">
        <MapComponent />
      </div>

      {showUserManagement && (
        <div className="admin-modal user-management">
          <h2>Manage User Role</h2>
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || "Tidak ada nama"}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value)
                      }
                      disabled={user.id === currentUserId}
                    >
                      <option value="user">User</option>
                      <option value="polisi">Polisi</option>
                      <option value="dinasPU">Dinas PU</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setShowUserManagement(false)}>Tutup</button>
        </div>
      )}

      {showVerification && (
        <div className="admin-modal user-verification">
          <h2>Verifikasi Data Pengguna</h2>
          {error && <p className="error-message">{error}</p>}
          <button className="refresh-button" onClick={refreshPendingUsers}>
            Muat Ulang Data
          </button>
          {loading ? (
            <p className="loading-state">Memuat data pengguna...</p>
          ) : pendingUsers.length === 0 ? (
            <p className="empty-state">
              Tidak ada pengguna yang menunggu verifikasi
            </p>
          ) : (
            <div className="verification-container">
              {pendingUsers.map((user) => (
                <div key={user.id} className="verification-card">
                  <div className="user-info">
                    <h3>{user.nama || "Tidak ada nama"}</h3>
                    <p>
                      <strong>Alamat:</strong> {user.alamat || "Tidak tersedia"}
                    </p>
                    <p>
                      <strong>NIK/No.KTP:</strong> {user.noKTP || "Tidak tersedia"}
                    </p>
                    {user.email && <p><strong>Email:</strong> {user.email}</p>}
                    {user.phone && <p><strong>No. Telepon:</strong> {user.phone}</p>}
                    {user.organization && (
                      <p><strong>Organisasi:</strong> {user.organization}</p>
                    )}
                    {user.additionalInfo && (
                      <p><strong>Info Tambahan:</strong> {user.additionalInfo}</p>
                    )}
                    {user.role && <p><strong>Peran:</strong> {user.role}</p>}
                  </div>
                  <div className="verification-actions">
                    <button
                      className="verify-button"
                      onClick={() => verifyUser(user.id, "verified")}
                    >
                      Verifikasi
                    </button>
                    <button
                      className="deny-button"
                      onClick={() => verifyUser(user.id, "denied")}
                    >
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setShowVerification(false)}>Tutup</button>
        </div>
      )}

{showPoliceForm && (
        <div className="admin-modal">
          <div className="add-station-form">
            <h2>Tambah Kantor Polisi Baru</h2>
            <form onSubmit={handleAddStation}>
              <input type="text" placeholder="Nama Kantor Polisi" value={newStation.name} onChange={(e) => setNewStation({ ...newStation, name: e.target.value })} required />
              <input type="text" placeholder="Alamat" value={newStation.address} onChange={(e) => setNewStation({ ...newStation, address: e.target.value })} required />
              <input type="number" placeholder="Latitude" value={newStation.lat} onChange={(e) => setNewStation({ ...newStation, lat: e.target.value })} required />
              <input type="number" placeholder="Longitude" value={newStation.lng} onChange={(e) => setNewStation({ ...newStation, lng: e.target.value })} required />
              <button type="submit">Simpan</button>
            </form>
          </div>

          <div className="station-list">
            <h3>Daftar Kantor Polisi</h3>
            <ul>
              {policeStations.map((station) => (
                <li key={station.id}>
                  <strong>{station.name}</strong> - {station.address} ({station.location.lat}, {station.location.lng})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
