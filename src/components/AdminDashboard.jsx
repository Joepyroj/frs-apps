import React, { useState, useEffect } from "react";
import { db } from "../config/firebaseConfig";
import { ref, get, update } from "firebase/database";
import { getAuth, onAuthStateChanged } from "firebase/auth"; 
import MapComponent from "./MapComponent";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        fetchCurrentUserRole(user.uid);
      } else {
        setCurrentUserId(null);
        setCurrentUserRole(null);
      }
    });
  }, []);

  const fetchCurrentUserRole = async (userId) => {
    try {
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        setCurrentUserRole(snapshot.val().role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = ref(db, "users");
        const snapshot = await get(usersRef);
        if (snapshot.exists()) {
          const usersData = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
          setUsers(usersData);
          console.log("Users fetched:", usersData);
        } else {
          console.log("No users found in database");
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    fetchUsers();
  }, []);

  const updateUserRole = async (userId, newRole) => {
    try {
      const userRef = ref(db, `users/${userId}`);
      await update(userRef, { role: newRole });
      setUsers(users.map(user => (user.id === userId ? { ...user, role: newRole } : user)));
      console.log(`User ${userId} role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating user role:", error);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Area Hover agar sidebar muncul saat kursor mendekati */}
      <div className="sidebar-hover-area"></div>
      
      {/* Sidebar */}
      <div className="sidebar">
        <h2>Menu Admin</h2>
        <p>Peran Anda: <strong>{currentUserRole || "Memuat..."}</strong></p>
        <ul>
          <li onClick={() => setShowUserManagement(true)}>Kelola Peran Pengguna</li>
        </ul>
      </div>

      {/* Map & Content */}
      <div className="map-container">
        <MapComponent />
      </div>

      {/* Kelola Peran Pengguna */}
      {showUserManagement && (
        <div className="user-management">
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
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name || "Tidak ada nama"}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={e => updateUserRole(user.id, e.target.value)}
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
    </div>
  );
};

export default AdminDashboard;