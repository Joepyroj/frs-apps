import React, { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { auth, db } from "./config/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserRole(data.role || null);
        } else {
          console.warn("❗ Dokumen profil tidak ditemukan");
          setUserRole(null);
        }
      } catch (error) {
        console.error("❌ Gagal mengambil peran pengguna:", error);
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
        <h3>🔄 Memuat data pengguna...</h3>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
