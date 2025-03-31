import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { auth, db } from "./config/firebaseConfig";
import { ref, get } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth"; // ✅ Tambahkan listener Firebase Auth
import Signup from "./components/Signup";
import Login from "./components/Login";
import PrivateRoute from "./components/PrivateRoute";
import AdminDashboard from "./components/AdminDashboard";
import PolisiDashboard from "./components/PolisiDashboard";
import DinasPUDashboard from "./components/DinasPUDashboard";
import UserDashboard from "./components/UserDashboard";
import Unauthorized from "./components/Unauthorized"; 
import NotFound from "./components/NotFound.jsx";

const App = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // 🔄 Pantau perubahan autentikasi secara real-time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe(); // Bersihkan listener saat komponen unmount
  }, []);

  // 🔄 Ambil role user ketika `user` berubah
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
          setUserRole(snapshot.val().role);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h3>🔄 Memuat data...</h3>
      </div>
    );
  }

  return (
    <Routes>
      {/* 🔹 Halaman Login & Sign Up */}
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* 🔹 Dashboard sesuai role */}
      <Route
        path="/admin-dashboard"
        element={
          <PrivateRoute userRole={userRole} allowedRoles={["admin"]}>
            <AdminDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/polisi-dashboard"
        element={
          <PrivateRoute userRole={userRole} allowedRoles={["polisi"]}>
            <PolisiDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/dinasPU-dashboard"
        element={
          <PrivateRoute userRole={userRole} allowedRoles={["dinasPU"]}>
            <DinasPUDashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/user-dashboard"
        element={
          <PrivateRoute userRole={userRole} allowedRoles={["user"]}>
            <UserDashboard />
          </PrivateRoute>
        }
      />

      {/* 🔹 Fallback jika tidak ada rute yang cocok */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
