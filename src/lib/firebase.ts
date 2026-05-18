import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvKYiufhl2jWGHRQUns_nIrFlodE2MlME",
  authDomain: "ssr-web-17b90.firebaseapp.com",
  projectId: "ssr-web-17b90",
  storageBucket: "ssr-web-17b90.firebasestorage.app",
  messagingSenderId: "635491971935",
  appId: "1:635491971935:web:3b460ae49347d1b9eafcea",
  measurementId: "G-F9MHXV1GCX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
