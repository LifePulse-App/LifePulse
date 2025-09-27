process.env.NODE_ENV = 'production';

// Dynamically import AFTER setting NODE_ENV
import('./server.js')
  .then(() => console.log("✅ Dev server started with NODE_ENV=production"))
  .catch(err => console.error("❌ Failed to start server:", err));
