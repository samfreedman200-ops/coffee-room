/**
 * PM2 process definition. Drop this on a server with PM2 installed
 * and run `pm2 start ecosystem.config.cjs` to launch.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save              # persist across reboots
 *   pm2 startup           # set up systemd integration
 */
module.exports = {
  apps: [
    {
      name: "coffee-room",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      // Single instance — better-sqlite3 only supports one writer per process
      // efficiently and the FTS triggers expect a single source of truth.
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // Override these with real values via `pm2 set` or a .env file.
        // SITE_URL: "https://example.com",
        // SITE_NAME: "Coffee Room",
      },
      out_file: "logs/out.log",
      error_file: "logs/err.log",
      time: true,
    },
  ],
};
