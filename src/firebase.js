import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace the below with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyBM3XixppIif9vvd8rwR8mML4xaTLf2JrQ",
  authDomain: "squarehexagon-games.firebaseapp.com",
  projectId: "squarehexagon-games",
  storageBucket: "squarehexagon-games.firebasestorage.app",
  messagingSenderId: "323592971309",
  appId: "1:323592971309:web:ca296a8f4eca5f8b8cc4a4",
  measurementId: "G-788TSS1VVF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database instance
export const auth = getAuth(app);
export const db = getFirestore(app);