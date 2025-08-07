// config.js
export const CLIENT_CONFIG = {
  // Change this to switch between clients
  currentClient: "client1", // Default client

  // List of all available clients
  clients: {
    client1: {
      name: "Client One",
      collections: {
        batches: "client1_batches",
        students: "client1_students",
        attendance: "client1_attendance"
      }
    },
    client2: {
      name: "Client Two",
      collections: {
        batches: "client2_batches",
        students: "client2_students",
        attendance: "client2_attendance"
      }
    }
    // Add more clients as needed
  }
};