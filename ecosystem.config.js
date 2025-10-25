module.exports = {
  apps: [
    {
      name: "StreakSphere-prod",
      script: "./backend/server.js",      // or your entry file
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "StreakSphere-dev",
      script: "./backend/server.js",
      env: {
        NODE_ENV: "development",
        PORT: 4000
      }
    }
  ]
};
