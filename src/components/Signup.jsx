import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import "./login.css"; // <-- Impor CSS yang sama dengan Login

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // Tambahkan state loading
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); // Mulai loading

    // **Validasi Password Sederhana (Opsional)**
    if (password.length < 6) {
        setError("Password minimal harus 6 karakter.");
        setLoading(false);
        return;
    }

    try {
      console.log("🔄 Proses pendaftaran dimulai...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ User dibuat:", user);

      // Kirim email verifikasi
      await sendEmailVerification(user);
      console.log("✉️ Email verifikasi dikirim.");

      // Simpan data user ke Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: "user",
        verified: false, // Status email belum diverifikasi
        createdAt: serverTimestamp(),
        // Reset data profil, biarkan user mengisinya nanti
        nama: "",
        noKTP: "",
        alamat: ""
      });
      console.log("💾 Data user disimpan ke Firestore.");

      alert("Pendaftaran berhasil! Silakan cek email Anda untuk verifikasi. Anda akan diarahkan ke halaman Login.");

      // Redirect ke halaman login setelah signup sukses
      navigate("/login");

    } catch (error) {
      console.error("❌ Error saat pendaftaran:", error);
      if (error.code === 'auth/email-already-in-use') {
        setError("Email ini sudah terdaftar. Silakan gunakan email lain atau login.");
      } else if (error.code === 'auth/weak-password') {
        setError("Password terlalu lemah. Gunakan minimal 6 karakter.");
      }
       else {
        setError("Terjadi kesalahan saat pendaftaran. Coba lagi nanti.");
      }
    } finally {
      setLoading(false); // Selesai loading
    }
  };

  return (
    
    <div className="login-container">
      <div className="login-content">
        {/* Bagian Ilustrasi (opsional, bisa diisi gambar atau biarkan kosong) */}
        <div className="login-illustration">
          {/* Jika ingin menambahkan ilustrasi khusus signup */}
          {/* <img src="/path/to/signup-illustration.png" alt="Signup Illustration" /> */}
        </div>

        {/* Container Form */}
        <div className="login-form-container">
          <div className="login-form-box">
            {/* Judul Form */}
            <h2 className="login-title">Sign Up</h2>
            {/* <p className="login-subtitle">Buat akun baru Anda</p> */} {/* Opsional: subtitle */}

            {/* Tampilkan Error */}
            {error && <div className="login-error">{error}</div>}

            {/* Form Pendaftaran */}
            <form onSubmit={handleSignup} className="login-form">
              {/* Input Nama */}
              <div className="login-input-group">
                <label htmlFor="name" className="login-label"></label>
                <input
                  id="name"
                  type="text"
                  placeholder="Masukkan nama lengkap Anda"
                  className="login-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading} // Disable saat loading
                />
              </div>

              {/* Input Email */}
              <div className="login-input-group">
                <label htmlFor="email" className="login-label"></label>
                <input
                  id="email"
                  type="email"
                  placeholder="Masukkan email Anda"
                  className="login-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading} // Disable saat loading
                />
              </div>

              {/* Input Password */}
              <div className="login-input-group">
                <label htmlFor="password" className="login-label"></label>
                <input
                  id="password"
                  type="password"
                  placeholder="Buat password (min. 6 karakter)"
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading} // Disable saat loading
                />
              </div>

              {/* Tombol Submit */}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "MENDAFTAR..." : "DAFTAR"}
              </button>

              {/* Link ke Halaman Login */}
              <div className="register-section">
                <span className="register-text">Sudah punya akun?</span>
                <Link to="/login" className="register-link">Login disini</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;