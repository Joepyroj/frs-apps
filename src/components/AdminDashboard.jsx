import React, { useState, useEffect } from "react";
import { db } from "../config/firebaseConfig";
import { ref, get, update } from "firebase/database";
import MapComponent from "./MapComponent";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

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
      {/* Sidebar */}
      <div 
        className={`sidebar ${sidebarVisible ? "visible" : ""}`} 
        onMouseEnter={() => setSidebarVisible(true)} 
        onMouseLeave={() => setSidebarVisible(false)}
      >
<<<<<<< Updated upstream
        <h2>Menu Admin</h2>
=======
        <h2>Admin Menu</h2>
>>>>>>> Stashed changes
        <ul>
          <li onClick={() => setShowUserManagement(true)}>Kelola Peran Pengguna</li>
        </ul>
      </div>

      {/* Map & Content */}
      <div className={`map-container ${sidebarVisible ? "map-shifted" : ""}`}>
        <MapComponent />
      </div>

      {/* Kelola Peran Pengguna */}
      {showUserManagement && (
        <div className="user-management">
<<<<<<< Updated upstream
          <h2>Kelola Peran Pengguna</h2>
=======
          <h2>Manage Role</h2>
>>>>>>> Stashed changes
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Peran</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={e => updateUserRole(user.id, e.target.value)}
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
