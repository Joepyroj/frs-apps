import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDLoubLA9iAJsE8NjjdaKiJKzLTJUXtDtI",
    authDomain: "frs-001.firebaseapp.com",
    databaseURL: "https://frs-001-default-rtdb.asia-southeast1.firebasedatabase.app", // 🔹 Tambahkan URL database
    projectId: "frs-001",
    storageBucket: "frs-001.appspot.com", // 🔹 Perbaiki storageBucket
    messagingSenderId: "258678074010",
    appId: "1:258678074010:web:9148c8a7399451a0f84d23",
    measurementId: "G-KD4LMZ140B"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, app, db };
