import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; 
import { auth, db } from "../config/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import "./login.css";
// Import your logo image - adjust the path as needed
// Background image is handled via CSS

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
    <div className="login-container"> 
      <div className="login-content">
        <div className="login-illustration">
          
          
        </div>
        
        <div className="login-form-container">
          <div className="login-form-box">
            <h2 className="login-title">Login</h2>
            
            
            {error && <div className="login-error">{error}</div>}
            
            <form onSubmit={handleLogin} className="login-form">
              <div className="login-input-group">
                <label htmlFor="username" className="login-label"></label>
                <input
                  id="username"
                  type="email"
                  placeholder="Username"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="login-input-group">
                <label htmlFor="password" className="login-label"></label>
                <input
                  id="password"
                  type="password"
                  placeholder="Password"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />                
              </div>
              
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "LOADING..." : "LOGIN"}
              </button>
              
              <div className="register-section">
                <span className="register-text">Belum Daftar?</span>
                <Link to="/signup" className="register-link">Daftar disini</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;