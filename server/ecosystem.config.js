// PM2 configuration for production deployment
module.exports = {
  apps: [{
    name: 'achtung-server',
    script: 'server.js',
    instances: 1, // Single instance for game state consistency
    exec_mode: 'fork', // Fork mode for single instance
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
