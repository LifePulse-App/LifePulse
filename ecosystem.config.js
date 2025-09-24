module.exports = {
  apps: [
    {
      name: "LifePulse-prod",
      script: "server.js",      // or your entry file
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "LifePulse-dev",
      script: "server.js",
      env: {
        NODE_ENV: "development",
        PORT: 4000
      }
    }
  ]
};
