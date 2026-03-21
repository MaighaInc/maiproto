const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Enable CORS for all routes
//app.use(cors());

// Optional: If you want to allow only specific origin
// app.use(cors({ origin: 'http://localhost:3000' }));
app.use(cors({ origin: 'http://localhost:3002' }));

app.get('/', (req, res) => {
  console.log ("Received request at /");
  res.json({ message: 'Hello from Node.js Server(5000) backend!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});