module.exports = {
  apps: [
    {
      name: "icp-server",
      script: "/opt/icp-website/current/apps/server/dist/index.js",
      cwd: "/opt/icp-website/current/apps/server",
      exec_mode: "cluster",
      instances: 2,
      wait_ready: true,
      listen_timeout: 10_000,
      kill_timeout: 10_000,
      max_memory_restart: "350M",
      autorestart: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
