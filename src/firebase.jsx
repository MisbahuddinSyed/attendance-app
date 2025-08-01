// src/firebase.jsx
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCo_WBa8mOprVVRC9mZt6QpSARmoYCV9FM",
  authDomain: "attendanceapp-70057.firebaseapp.com",
  databaseURL: "https://attendanceapp-70057-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "attendanceapp-70057",
  storageBucket: "attendanceapp-70057.appspot.com",
  messagingSenderId: "581083951126",
  appId: "1:581083951126:web:50b5b3de92ddd8ffd48537",
  measurementId: "G-7T1GFJDX5B"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
