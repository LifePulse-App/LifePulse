module.exports = {
  apps: [
    {
      name: "StreakSphere-prod",
      script: "./backend/server.js",      // or your entry file
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    },
    {
      name: "StreakSphere-dev",
      script: "./backend/server.js",
      env: {
        NODE_ENV: "development",
        PORT: 40000
      }
    }
  ]
};
