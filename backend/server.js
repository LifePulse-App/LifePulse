const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 4000 : 3000;  // lowercase 'development', no extra space

// Test route
app.get('/health', (req, res) => {
  res.send(`Backend API is running on ${PORT} in ${ENV} mode🚀`);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} in ${ENV} mode`);
});

