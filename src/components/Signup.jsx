import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../config/firebaseConfig";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Untuk redirect setelah signup

  const handleSignup = async (e) => {
    e.preventDefault();
    setError(""); // Reset error sebelum mencoba sign up

    try {
      // Buat user dengan email & password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Kirim email verifikasi
      await sendEmailVerification(user);

      // Simpan data user ke Firebase Realtime Database dengan role "user"
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        role: "user", // Semua user baru mendapat role "user"
        verified: false, // Status email belum diverifikasi
        createdAt: serverTimestamp(),
      });

      alert("Pendaftaran berhasil! Silakan cek email untuk verifikasi.");

      // Redirect ke halaman login setelah signup sukses
      navigate("/login");
    } catch (error) {
      setError(error.message); // Menampilkan error ke UI
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      {error && <p className="error">{error}</p>} {/* Tampilkan error jika ada */}
      <form onSubmit={handleSignup}>
        <input type="text" placeholder="Nama Lengkap" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Daftar</button>
      </form>
      <p>Sudah punya akun? <Link to="/login">Login</Link></p>
    </div>
  );
};

export default Signup;
