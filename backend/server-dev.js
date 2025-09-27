process.env.NODE_ENV = 'development';

// Dynamically import AFTER setting NODE_ENV
import('./server.js')
  .then(() => console.log("✅ Dev server started with NODE_ENV=development"))
  .catch(err => console.error("❌ Failed to start server:", err));
