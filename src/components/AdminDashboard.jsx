import React, { useEffect, useState } from "react";
import { db } from "../config/firebaseConfig"; 
import { ref, get, update } from "firebase/database";

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersRef = ref(db, "users");
            const snapshot = await get(usersRef);
            if (snapshot.exists()) {
                setUsers(Object.entries(snapshot.val()));
            }
        };

        fetchUsers();
    }, []);

    const updateRole = async (userId, newRole) => {
        const userRef = ref(db, `users/${userId}`);
        await update(userRef, { role: newRole });
        alert(`Role pengguna berhasil diubah menjadi ${newRole}`);
        window.location.reload(); // Refresh untuk update data
    };

    return (
        <div>
            <h2>Admin Dashboard - Kelola Peran Pengguna</h2>
            <table>
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Ubah Role</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(([id, user]) => (
                        <tr key={id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                {user.role !== "admin" && (
                                    <>
                                        <button onClick={() => updateRole(id, "polisi")}>Jadikan Polisi</button>
                                        <button onClick={() => updateRole(id, "dinasPU")}>Jadikan Dinas PU</button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminDashboard;
