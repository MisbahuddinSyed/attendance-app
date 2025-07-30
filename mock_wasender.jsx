const express = require('express');
const cors = require('cors'); // Add this
const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Allow JSON requests
app.use(express.json());

app.post('/send', (req, res) => {
  const { phone, message } = req.body;
  console.log(`[MOCK] Would send to ${phone}: ${message}`);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});