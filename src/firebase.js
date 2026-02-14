import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Replace the below with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyD88CxQZqCHL_SIQNFD8uWUhQgkiuo0eJ4",
  authDomain: "gameofconstants.firebaseapp.com",
  projectId: "gameofconstants",
  storageBucket: "gameofconstants.firebasestorage.app",
  messagingSenderId: "942807395240",
  appId: "1:942807395240:web:5567842aff6b28eae38b9d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the database instance
export const db = getFirestore(app);
