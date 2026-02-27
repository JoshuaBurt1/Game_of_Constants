import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace the below with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyB1jhXYM_1nkOpvkhokcik9_zYSrSenRRM",
  authDomain: "squarehexagon-holdings.firebaseapp.com",
  projectId: "squarehexagon-holdings",
  storageBucket: "squarehexagon-holdings.firebasestorage.app",
  messagingSenderId: "702841156351",
  appId: "1:702841156351:web:b105027698de92b56d52ca",
  measurementId: "G-QV7Q6LZZHJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database instance
export const auth = getAuth(app);
export const db = getFirestore(app);