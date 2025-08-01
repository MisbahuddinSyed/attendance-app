import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import axios from 'axios';

// Add this helper function at the top of your file
const getCurrentLocalDate = () => {
  return new Date().toLocaleDateString('en-IN', { 
    timeZone: 'Asia/Kolkata' // Change to your timezone
  });
};
const getToday = () => {
  const now = new Date();
  // For testing purposes only - remove this line in production
  // now.setDate(now.getDate() + 1); // Uncomment to simulate next day
  return now.toISOString().split('T')[0];
};

function App() {
  // State management
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [data, setData] = useState({ batches: [], students: [], attendance: [] });
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedTab, setSelectedTab] = useState('attendance');
  const [date, setDate] = useState(getToday());
  const [message, setMessage] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', phone: '', batchId: '' });
  const [isSending, setIsSending] = useState(false);
  const [testData, setTestData] = useState({
    testName: '',
    totalMarks: '',
    marks: {}
  });
  const [initialized, setInitialized] = useState(false);

  const WASENDER_API_KEY = "8cad52725d4bddf6fccff9574ba590b722ffc1d51e24b83e8041fc3a26acea69";

  // Data loading
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [batchesSnapshot, studentsSnapshot, attendanceSnapshot] = await Promise.all([
          getDocs(collection(db, 'batches')),
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'attendance'))
        ]);

        setData({
          batches: batchesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          students: studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          attendance: attendanceSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setMessage("Error loading data. Please refresh.");
      } finally {
        setInitialized(true);
      }
    };

    fetchData();
  }, []);

  // Add this near your other useEffect hooks
  useEffect(() => {
    // Update date every minute (adjust interval as needed)
    const interval = setInterval(() => {
      setDate(getToday());
    }, 60000); // 60,000ms = 1 minute

    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const getStudentsForBatch = useCallback((batchId) => {
    return data.students.filter(s => s.batchId === batchId);
  }, [data.students]);

  /*const getTodaysAttendance = useCallback(() => {
    if (!selectedBatch) return [];
    const today = getToday();
    const record = data.attendance.find(r => r.batchId === selectedBatch && r.date === today) || { students: [] };

    // Ensure students is always an array
    const studentIds = record.students || [];

    return getStudentsForBatch(selectedBatch).map(s => ({
      ...s,
      present: studentIds.includes(s.id)
    }));
  }, [selectedBatch, data.attendance, getStudentsForBatch]);*/

  const getTodaysAttendance = useCallback(() => {
    if (!selectedBatch) return [];
    const today = getToday();

    // Find the attendance record or create a default one
    const record = data.attendance.find(r => r.batchId === selectedBatch && r.date === today);

    // Get the student IDs, defaulting to empty array if not found
    const studentIds = record?.students || [];

    // Get all students in the batch
    const batchStudents = getStudentsForBatch(selectedBatch);

    // Return students with attendance status
    return batchStudents.map(s => ({
      ...s,
      present: studentIds.includes(s.id)
    }));
  }, [selectedBatch, data.attendance, getStudentsForBatch]);

  // Attendance functions
  /*const toggleAttendance = async (studentId, isCurrentlyPresent) => {
    try {
      const today = getToday();
      const docRef = doc(db, 'attendance', `${selectedBatch}_${today}`);
      const docSnap = await getDoc(docRef);

      let attendanceData = {
        batchId: selectedBatch,
        date: today,
        students: docSnap.exists() ? [...docSnap.data().students] : []
      };

      if (isCurrentlyPresent) {
        attendanceData.students = attendanceData.students.filter(id => id !== studentId);
      } else {
        if (!attendanceData.students.includes(studentId)) {
          attendanceData.students.push(studentId);
        }
      }

      await setDoc(docRef, attendanceData);

      setData(prev => ({
        ...prev,
        attendance: prev.attendance.filter(r => !(r.batchId === selectedBatch && r.date === today))
          .concat(attendanceData)
      }));

      setMessage(`Student marked ${isCurrentlyPresent ? 'absent' : 'present'}`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      setMessage(`Failed to update: ${error.message}`);
    }
  };*/

  const toggleAttendance = async (studentId, isCurrentlyPresent) => {
    try {
      const today = getToday();
      setDate(today); // Update the state with today's date
      const docRef = doc(db, 'attendance', `${selectedBatch}_${today}`);
      const docSnap = await getDoc(docRef);

      // Initialize with empty students array (SAFETY CHECK #1)
      let attendanceData = {
        batchId: selectedBatch,
        date: today,
        students: [] // Always starts as array
      };

      // If document exists, safely copy its data (SAFETY CHECK #2)
      if (docSnap.exists()) {
        attendanceData.students = [...(docSnap.data().students || [])];
      }

      // Final array validation (SAFETY CHECK #3)
      if (!Array.isArray(attendanceData.students)) {
        attendanceData.students = [];
      }

      // Your existing toggle logic remains unchanged below
      if (isCurrentlyPresent) {
        attendanceData.students = attendanceData.students.filter(id => id !== studentId);
      } else {
        if (!attendanceData.students.includes(studentId)) {
          attendanceData.students.push(studentId);
        }
      }

      await setDoc(docRef, attendanceData);

      setData(prev => ({
        ...prev,
        attendance: prev.attendance.filter(r => !(r.batchId === selectedBatch && r.date === today))
          .concat(attendanceData)
      }));

      setMessage(`Student marked ${isCurrentlyPresent ? 'absent' : 'present'}`);
    } catch (error) {
      console.error("Error updating attendance:", error);
      setMessage(`Failed to update: ${error.message}`);
    }
  };

  // Message sending functions
  const sendAbsenceMessages = async () => {
    const today = getToday();
    const absentStudents = getTodaysAttendance().filter(s => !s.present && s.phone);

    if (absentStudents.length === 0) {
      setMessage('No absent students with phone numbers');
      return;
    }

    setIsSending(true);
    setMessage('Sending messages...');

    try {
      let successfulSends = 0;

      for (const student of absentStudents) {
        try {
          const phone = student.phone.startsWith('+') ? student.phone : `+${student.phone}`;
          const message = `Dear Parent,\n${student.name} was absent on ${getCurrentLocalDate()}.`;

          const response = await axios.post(
            "https://wasenderapi.com/api/send-message",
            { to: phone, text: message },
            {
              headers: {
                'Authorization': `Bearer ${WASENDER_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response.data?.success || response.data?.message_id) {
            successfulSends++;
          }
        } catch (error) {
          console.error(`Failed to send to ${student.phone}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setMessage(`Sent ${successfulSends}/${absentStudents.length} messages`);
    } catch (error) {
      console.error("Error sending messages:", error);
      setMessage("Failed to send messages");
    } finally {
      setIsSending(false);
    }
  };

  // Batch management
  const addBatch = async () => {
    if (!newBatch.trim()) {
      setMessage("Batch name required");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'batches'), {
        name: newBatch.trim(),
        createdAt: Timestamp.now()
      });

      setData(prev => ({
        ...prev,
        batches: [...prev.batches, { id: docRef.id, name: newBatch.trim() }]
      }));
      setNewBatch('');
      setMessage(`Batch "${newBatch}" added`);
    } catch (error) {
      console.error("Error adding batch:", error);
      setMessage("Failed to add batch");
    }
  };

  // Student management
  const addStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.batchId) {
      setMessage("Name and batch required");
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'students'), {
        name: newStudent.name.trim(),
        phone: newStudent.phone.trim(),
        batchId: newStudent.batchId,
        createdAt: Timestamp.now()
      });

      setData(prev => ({
        ...prev,
        students: [...prev.students, { 
          id: docRef.id, 
          ...newStudent,
          phone: newStudent.phone.trim()
        }]
      }));
      setNewStudent({ name: '', phone: '', batchId: '' });
      setMessage(`Student "${newStudent.name}" added`);
    } catch (error) {
      console.error("Error adding student:", error);
      setMessage("Failed to add student");
    }
  };

  const deleteStudent = async (studentId) => {
    if (!window.confirm('Delete this student?')) return;

    try {
      await deleteDoc(doc(db, 'students', studentId));
      setData(prev => ({
        ...prev,
        students: prev.students.filter(s => s.id !== studentId)
      }));
      setMessage('Student deleted');
    } catch (error) {
      console.error("Error deleting student:", error);
      setMessage("Failed to delete");
    }
  };

  // History functions
  const getStudentAttendanceHistory = (studentId) => {
    return data.attendance
      .filter(record => record.students?.includes(studentId))
      .map(record => ({
        date: record.date,
        status: 'Absent',
        batch: data.batches.find(b => b.id === record.batchId)?.name || 'Unknown'
      }));
  };

  // Test management
  const sendTestMarks = async () => {
    if (!testData.testName || !testData.totalMarks) {
      setMessage('Test name and total marks required');
      return;
    }

    setIsSending(true);
    const students = getStudentsForBatch(selectedBatch);
    setMessage(`Sending test results (0/${students.length})`);

    try {
      let successfulSends = 0;

      for (const student of students) {
        const marks = testData.marks[student.id];
        if (!marks?.obtained || !student.phone) continue;

        const phone = student.phone.startsWith('+') ? student.phone : `+${student.phone}`;
        const message = `Dear Parent,\n${student.name} scored ${marks.obtained}/${testData.totalMarks} in ${testData.testName}.`;

        try {
          const response = await axios.post(
            "https://wasenderapi.com/api/send-message",
            { to: phone, text: message },
            {
              headers: {
                'Authorization': `Bearer ${WASENDER_API_KEY}`,
                'Content-Type': 'application/json'
              },
              timeout: 10000
            }
          );

          if (response.data?.success || response.data?.message_id) {
            successfulSends++;
            setMessage(`Sending test results (${successfulSends}/${students.length})`);
          }
        } catch (error) {
          console.error(`Failed for ${phone}:`, error);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setMessage(`Sent ${successfulSends}/${students.length} test results`);
    } catch (error) {
      setMessage("Failed to send test results");
      console.error("Error:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Render functions
  const renderBatches = () => (
    <div className="batches-list">
      <h2>Select Batch</h2>
      {data.batches.length === 0 ? (
        <p>No batches available</p>
      ) : (
        <ul>
          {data.batches.map(batch => (
            <li key={batch.id}>
              <button 
                onClick={() => setSelectedBatch(batch.id)} 
                className="batch-button"
              >
                {batch.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderAttendance = () => {
    const batch = data.batches.find(b => b.id === selectedBatch);
    const todaysAttendance = getTodaysAttendance();
    const absentCount = todaysAttendance.filter(s => !s.present).length;

    return (
      <div className="attendance-section">
        <button onClick={() => setSelectedBatch(null)} className="back-button">
          ← Back to Batches
        </button>
        
        <h2>{batch?.name} Attendance — {getCurrentLocalDate()}</h2>


        <div className="attendance-list">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {todaysAttendance.map(student => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.phone || 'N/A'}</td>
                  <td>{student.present ? 'Present ✅' : 'Absent ❌'}</td>
                  <td>
                    <button 
                      onClick={() => toggleAttendance(student.id, student.present)}
                      className={student.present ? 'mark-absent' : 'mark-present'}
                    >
                      {student.present ? 'Mark Absent' : 'Mark Present'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="actions">
          <button 
            onClick={sendAbsenceMessages} 
            disabled={isSending || absentCount === 0}
            className="send-button"
          >
            {isSending ? 'Sending...' : `Send Notifications (${absentCount})`}
          </button>
        </div>
      </div>
    );
  };

  const renderManagement = () => (
    <div className="management-section">
      <h2>Batch Management</h2>
      <div className="add-batch">
        <input
          type="text"
          placeholder="New batch name"
          value={newBatch}
          onChange={e => setNewBatch(e.target.value)}
        />
        <button onClick={addBatch}>Add Batch</button>
      </div>

      <h2>Student Management</h2>
      <div className="add-student">
        <input
          type="text"
          placeholder="Student name"
          value={newStudent.name}
          onChange={e => setNewStudent({...newStudent, name: e.target.value})}
        />
        <input
          type="text"
          placeholder="Phone number"
          value={newStudent.phone}
          onChange={e => setNewStudent({...newStudent, phone: e.target.value})}
        />
        <select
          value={newStudent.batchId}
          onChange={e => setNewStudent({...newStudent, batchId: e.target.value})}
        >
          <option value="">Select Batch</option>
          {data.batches.map(batch => (
            <option key={batch.id} value={batch.id}>{batch.name}</option>
          ))}
        </select>
        <button onClick={addStudent}>Add Student</button>
      </div>

      <h2>Current Students</h2>
      <div className="student-list">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Batch</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map(student => {
              const batch = data.batches.find(b => b.id === student.batchId);
              return (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.phone || 'N/A'}</td>
                  <td>{batch?.name || 'Unknown'}</td>
                  <td>
                    <button 
                      onClick={() => deleteStudent(student.id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderHistory = () => {
    if (!selectedStudent) {
      return (
        <div className="history-section">
          <h2>Select a Student to View History</h2>
          <table className="student-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Batch</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map(student => {
                const batch = data.batches.find(b => b.id === student.batchId);
                return (
                  <tr key={student.id}>
                    <td>{student.name}</td>
                    <td>{batch?.name || 'Unknown'}</td>
                    <td>
                      <button 
                        onClick={() => setSelectedStudent(student.id)}
                        className="view-button"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ); 
    }

    const student = data.students.find(s => s.id === selectedStudent);
    const history = getStudentAttendanceHistory(selectedStudent);
    const batch = data.batches.find(b => b.id === student.batchId);

    return (
      <div className="history-section">
        <button onClick={() => setSelectedStudent(null)} className="back-button">
          ← Back to All Students
        </button>
        <h2>Attendance History for {student.name} ({batch?.name || 'Unknown'})</h2>

        {history.length === 0 ? (
          <p>No absence records found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>Batch</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, index) => (
                <tr key={index}>
                  <td>{record.date}</td>
                  <td className="absent">Absent</td>
                  <td>{record.batch}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderTests = () => {
    if (!selectedBatch) {
      return (
        <div className="batches-list">
          <h2>Select Batch to Enter Test Marks</h2>
          {data.batches.length === 0 ? (
            <p>No batches available</p>
          ) : (
            <ul>
              {data.batches.map(batch => (
                <li key={batch.id}>
                  <button 
                    onClick={() => setSelectedBatch(batch.id)} 
                    className="batch-button"
                  >
                    {batch.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    const batch = data.batches.find(b => b.id === selectedBatch);
    const students = getStudentsForBatch(selectedBatch);

    return (
      <div className="tests-section">
        <button onClick={() => setSelectedBatch(null)} className="back-button">
          ← Back to Batches
        </button>

        <h2>{batch?.name} - Test Marks</h2>

        <div className="test-info">
          <input
            type="text"
            placeholder="Test Name"
            value={testData.testName}
            onChange={(e) => setTestData({...testData, testName: e.target.value})}
          />
          <input
            type="number"
            placeholder="Total Marks"
            value={testData.totalMarks}
            onChange={(e) => setTestData({...testData, totalMarks: e.target.value})}
          />
        </div>

        <div className="marks-table">
          <table>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Marks Obtained</th>
                <th>Out Of</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>
                    <input
                      type="number"
                      value={testData.marks[student.id]?.obtained || ''}
                      onChange={(e) => setTestData({
                        ...testData,
                        marks: {
                          ...testData.marks,
                          [student.id]: {
                            ...testData.marks[student.id],
                            obtained: e.target.value,
                            total: testData.totalMarks
                          }
                        }
                      })}
                    />
                  </td>
                  <td>{testData.totalMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="actions">
          <button 
            onClick={sendTestMarks}
            disabled={!testData.testName || !testData.totalMarks || isSending}
            className="send-button"
          >
            {isSending ? 'Sending...' : 'Send Test Results'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      {!initialized ? (
        <div className="loading-screen">
          <h2>Loading Attendance System...</h2>
          <div className="spinner"></div>
        </div>
      ) : (
        <>
          <header className="App-header">
            <h1>Attendance System</h1>
          </header>

          <main>
            <div className="tabs">
              <button
                className={selectedTab === 'attendance' ? 'active' : ''}
                onClick={() => setSelectedTab('attendance')}
              >
                Attendance
              </button>
              <button
                className={selectedTab === 'management' ? 'active' : ''}
                onClick={() => setSelectedTab('management')}
              >
                Management
              </button>
              <button
                className={selectedTab === 'history' ? 'active' : ''}
                onClick={() => setSelectedTab('history')}
              >
                History
              </button>
              <button
                className={selectedTab === 'tests' ? 'active' : ''}
                onClick={() => setSelectedTab('tests')}
              >
                Tests
              </button>
            </div>

            {message && <div className="message">{message}</div>}

            {selectedTab === 'attendance' ? (
              !selectedBatch ? renderBatches() : renderAttendance()
            ) : selectedTab === 'management' ? (
              renderManagement()
            ) : selectedTab === 'history' ? (
              renderHistory()
            ) : (
              renderTests()
            )}
          </main>

          <footer className="app-footer">
            <p>© {new Date().getFullYear()} School Attendance System</p>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;