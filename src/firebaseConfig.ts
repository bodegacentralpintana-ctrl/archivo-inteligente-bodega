import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "bodegacentral-24dd9.firebaseapp.com",
  projectId: "bodegacentral-24dd9",
  storageBucket: "bodegacentral-24dd9.appspot.com",
  messagingSenderId: "282089103551",
  appId: "1:282089103551:web:49ba28a3a1d90c774d660a"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);