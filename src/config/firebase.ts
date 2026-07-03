import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBZsq6sj9xpO3hAM0hjGf317Xdt7a_W-gQ",
  authDomain: "trago-ab3e5.firebaseapp.com",
  databaseURL: "https://trago-ab3e5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "trago-ab3e5",
  storageBucket: "trago-ab3e5.firebasestorage.app",
  messagingSenderId: "678197524294",
  appId: "1:678197524294:web:25473011114f9f101c1747",
  measurementId: "G-Z0ZWJDDFTF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo các dịch vụ Firebase
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
