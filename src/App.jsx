// App.jsx
import React, { useEffect, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import axios from "axios";

function App() {
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [view, setView] = useState("attendance");
  const [attendanceDate, setAttendanceDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [markedAbsent, setMarkedAbsent] = useState({});
  const [history, setHistory] = useState([]);
  const API_KEY =
    "8cad52725d4bddf6fccff9574ba590b722ffc1d51e24b83e8041fc3a26acea69";
  const SEND_URL = "https://wasenderapi.com/api/send-message";

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchStudents(selectedBatch);
    } else {
      setStudents([]);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    const querySnapshot = await getDocs(collection(db, "batches"));
    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setBatches(data);
  };

  const fetchStudents = async (batchId) => {
    const q = query(collection(db, "students"), where("batchId", "==", batchId));
    const querySnapshot = await getDocs(q);
    const data = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setStudents(data);
    const initialAbsent = {};
    data.forEach((student) => (initialAbsent[student.id] = false));
    setMarkedAbsent(initialAbsent);
  };

  const handleAddStudent = async () => {
    if (!selectedBatch || !studentName || !studentPhone) return;
    await addDoc(collection(db, "students"), {
      name: studentName,
      phone: studentPhone,
      batchId: selectedBatch,
    });
    setStudentName("");
    setStudentPhone("");
    fetchStudents(selectedBatch);
  };

  const handleDeleteStudent = async (id) => {
    await deleteDoc(doc(db, "students", id));
    fetchStudents(selectedBatch);
  };

  const handleMarkAttendance = async () => {
    const today = attendanceDate;
    for (const student of students) {
      const status = markedAbsent[student.id] ? "absent" : "present";
      await setDoc(doc(db, "attendance", `${student.id}_${today}`), {
        studentId: student.id,
        studentName: student.name,
        batchId: selectedBatch,
        batchName: batches.find((b) => b.id === selectedBatch)?.name || "",
        date: today,
        status,
      });

      if (status === "absent") {
        await axios.post(SEND_URL, {
          api_key: API_KEY,
          message: `Your child ${student.name} was absent on ${today}.`,
          number: student.phone,
        });
      }
    }
    alert("Attendance submitted and messages sent!");
  };

  const fetchAttendanceHistory = async () => {
    const querySnapshot = await getDocs(collection(db, "attendance"));
    const data = querySnapshot.docs.map((doc) => doc.data());
    setHistory(data);
  };

  const renderAttendance = () => (
    <div>
      <h2>Mark Attendance</h2>
      <input
        type="date"
        value={attendanceDate}
        onChange={(e) => setAttendanceDate(e.target.value)}
      />
      <select onChange={(e) => setSelectedBatch(e.target.value)} value={selectedBatch}>
        <option value="">Select Batch</option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.name}
          </option>
        ))}
      </select>
      {students.map((student) => (
        <div key={student.id}>
          <label>
            <input
              type="checkbox"
              checked={markedAbsent[student.id] || false}
              onChange={(e) =>
                setMarkedAbsent({
                  ...markedAbsent,
                  [student.id]: e.target.checked,
                })
              }
            />
            {student.name} ({student.phone})
          </label>
        </div>
      ))}
      <button onClick={handleMarkAttendance}>Submit Attendance</button>
    </div>
  );

  const renderHistory = () => (
    <div>
      <h2>Attendance History</h2>
      <button onClick={fetchAttendanceHistory}>Refresh</button>
      <ul>
        {history.map((entry, idx) => (
          <li key={idx}>
            {entry.date} - {entry.studentName} - {entry.status}
          </li>
        ))}
      </ul>
    </div>
  );

  const renderAddStudent = () => (
    <div>
      <h2>Add Student</h2>
      <select onChange={(e) => setSelectedBatch(e.target.value)} value={selectedBatch}>
        <option value="">Select Batch</option>
        {batches.map((batch) => (
          <option key={batch.id} value={batch.id}>
            {batch.name}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Student Name"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Parent's Phone (10 digit)"
        value={studentPhone}
        onChange={(e) => setStudentPhone(e.target.value)}
      />
      <button onClick={handleAddStudent}>Add Student</button>
      <h3>Delete Student</h3>
      {students.map((student) => (
        <div key={student.id}>
          {student.name} ({student.phone})
          <button onClick={() => handleDeleteStudent(student.id)}>Delete</button>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ padding: 20 }}>
      <h1>Attendance App</h1>
      <div>
        <button onClick={() => setView("attendance")}>Attendance</button>
        <button onClick={() => setView("history")}>View History</button>
        <button onClick={() => setView("add")}>Add/Delete Student</button>
      </div>
      {view === "attendance" && renderAttendance()}
      {view === "history" && renderHistory()}
      {view === "add" && renderAddStudent()}
    </div>
  );
}

export default App;

