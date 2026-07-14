import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBQchb1v5NX2sp2s0YVRMd2v_snVt8WVjI",
  authDomain: "bodegacentral-24dd9.firebaseapp.com",
  projectId: "bodegacentral-24dd9",
  storageBucket: "bodegacentral-24dd9.firebasestorage.app",
  messagingSenderId: "282089103551",
  appId: "1:282089103551:web:49ba28a3a1d90c774d660a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);