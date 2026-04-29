import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDS36VZU4pi8NQBl0861qOYYcU1W26JfWw",
  authDomain: "caspian-tandoori.firebaseapp.com",
  projectId: "caspian-tandoori",
  storageBucket: "caspian-tandoori.firebasestorage.app",
  messagingSenderId: "565833550280",
  appId: "1:565833550280:web:4db91bae8c794baa7418fd",
  measurementId: "G-CBK42TQSM8",
};

const app = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();