import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => {
    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h2>404 - Halaman Tidak Ditemukan</h2>
            <p>Maaf, halaman yang Anda cari tidak tersedia.</p>
            <Link to="/">Kembali ke Beranda</Link>
        </div>
    );
};

export default NotFound;
