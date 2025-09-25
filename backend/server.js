const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.send('Backend API is running 🚀');
});

// Pick port based on environment
const ENV = process.env.NODE_ENV;
const PORT = ENV === 'development' ? 4000 : 3000;  // lowercase 'development', no extra space

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} in ${ENV} mode`);
});

