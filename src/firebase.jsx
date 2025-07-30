// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCo_WBa8mOprVVRC9mZt6QpSARmoYCV9FM",
  authDomain: "attendanceapp-70057.firebaseapp.com",
  projectId: "attendanceapp-70057",
  storageBucket: "attendanceapp-70057.appspot.com",
  messagingSenderId: "581083951126",
  appId: "G-7T1GFJDX5B"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const getPendingMessagesForTasker = async () => {
  try {
    const pendingRef = collection(db, 'pendingMessages');
    const q = query(pendingRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log("No pending messages found");
      return;
    }

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      phone: doc.data().phone,
      message: doc.data().message
    }));

    await setDoc(doc(db, 'taskerFormat', 'current'), { messages });
    console.log("Data reformatted for Tasker successfully!");
    return true;
  } catch (error) {
    console.error("Error reformatting data:", error);
    throw error; // Re-throw to handle in calling function
  }
};
// In your Replit/Firebase code
const testDevice = async () => {
  const response = await fetch('https://api.pushbullet.com/v2/devices/ujCGj1RpVVksjuUFnSMomW', {
    method: 'GET',
    headers: {
      'Access-Token': 'YOUR_ACCESS_TOKEN',
      'Content-Type': 'application/json'
    }
  });
  console.log(await response.json());
};

testDevice();

export { db };