const prodApps = [];
const devApps = [];

// Production (12 instances)
for (let i = 1; i <= 12; i++) {
  prodApps.push({
    name: `StreakSphere-prod-${i}`,
    script: "./backend/server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",

    env: {
      NODE_ENV: "production",
      PORT: 8080 + i, // 8081 - 8092
    },

    autorestart: true,
    watch: false,
    max_memory_restart: "750M",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  });
}

// Development (2 instances)
for (let i = 1; i <= 2; i++) {
  devApps.push({
    name: `StreakSphere-dev-${i}`,
    script: "./backend/server.js",
    cwd: __dirname,
    instances: 1,
    exec_mode: "fork",

    env: {
      NODE_ENV: "development",
      PORT: 40000 + i, // 40001 - 40002
    },

    autorestart: true,
    watch: false,
    max_memory_restart: "500M",
    merge_logs: true,
    log_date_format: "YYYY-MM-DD HH:mm:ss",
  });
}

module.exports = {
  apps: [
    ...prodApps,
    ...devApps,
  ],
};