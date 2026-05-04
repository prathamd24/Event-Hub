import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyATTbMKKhbruDUnPBRwGA6PcNcBcDr60FM",
  authDomain: "event-hub-8fe51.web.app",
  projectId: "event-hub-8fe51",
  storageBucket: "event-hub-8fe51.firebasestorage.app",
  messagingSenderId: "1025858543547",
  appId: "1:1025858543547:web:9efd0972544842fd42ae9e",
  measurementId: "G-YCH8W747LT"
};

// Log for verification (cache busting)
console.log(`[Firebase Auth] Configured with domain: ${firebaseConfig.authDomain}`);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, storage, db, googleProvider };
