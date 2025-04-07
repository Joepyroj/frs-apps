import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { auth, db } from "../config/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      console.log("🔄 Proses login dimulai...");

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ Login berhasil:", user);

      // ** Cek apakah email sudah diverifikasi
      if (!user.emailVerified) {
        setError("Email belum diverifikasi. Silakan cek email Anda.");
        setLoading(false);
        return;
      }

      // ** Ambil role pengguna dari database
      const userDocRef = doc(db, "users", user.uid);
      const snapshot = await getDoc(userDocRef);

      if (snapshot.exists()) {
        const data = snapshot.data();
        const role = data.role;
        console.log("👤 Peran pengguna:", role);

        // ** Navigasi berdasarkan peran
        if (role === "admin") {
          console.log("➡️ Navigating to /admin-dashboard");
          navigate("/admin-dashboard");
        } else if (role === "polisi") {
          console.log("➡️ Navigating to /polisi-dashboard");
          navigate("/polisi-dashboard");
        } else if (role === "dinasPU") {
          console.log("➡️ Navigating to /dinasPU-dashboard");
          navigate("/dinasPU-dashboard");
        } else {
          console.log("➡️ Navigating to /user-dashboard");
          navigate("/user-dashboard");
        }
      } else {
        setError("Data pengguna tidak ditemukan. Silakan hubungi admin.");
        console.error("⚠️ Dokumen user tidak ditemukan di Firestore.");
      }
    } catch (err) {
      console.error("❌ Error saat login:", err);

      if (err.code === "auth/user-not-found") {
        setError("Akun tidak ditemukan. Silakan daftar terlebih dahulu.");
      } else if (err.code === "auth/wrong-password") {
        setError("Password salah.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Terlalu banyak percobaan login. Coba lagi nanti.");
      } else {
        setError("Terjadi kesalahan. Coba lagi nanti.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Login</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          placeholder="Email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          autoComplete="email"
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          autoComplete="current-password"
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </button>
      </form>
      <p style={{ marginTop: "10px" }}>
        Belum punya akun? <Link to="/signup">Daftar di sini</Link>
      </p>
    </div>
  );
};

export default Login;
