'use strict';

const dotenv = require('dotenv');

// Load environment variables FIRST
dotenv.config();

// Import DB test function
const { testConnection } = require('./config/db');

// Import Express app
const app = require('./app');

const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// DATABASE STARTUP CHECK
// ─────────────────────────────────────────────
const startDatabase = async () => {
  try {
    await testConnection();
    console.log('  [DB] Connection successful');
  } catch (error) {
    console.error('  [DB] Connection failed:', error.message);
    process.exit(1); // stop server if DB fails (important for SaaS apps)
  }
};

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log('');
    console.log('  ██████╗ ██╗ ██████╗ ██╗████████╗ █████╗ ██╗      ███╗   ███╗███████╗███╗   ██╗██╗   ██╗');
    console.log('  ██╔══██╗██║██╔════╝ ██║╚══██╔══╝██╔══██╗██║      ████╗ ████║██╔════╝████╗  ██║██║   ██║');
    console.log('  ██║  ██║██║██║  ███╗██║   ██║   ███████║██║      ██╔████╔██║█████╗  ██╔██╗ ██║██║   ██║');
    console.log('  ██║  ██║██║██║   ██║██║   ██║   ██╔══██║██║      ██║╚██╔╝██║██╔══╝  ██║╚██╗██║██║   ██║');
    console.log('  ██████╔╝██║╚██████╔╝██║   ██║   ██║  ██║███████╗ ██║ ╚═╝ ██║███████╗██║ ╚████║╚██████╔╝');
    console.log('  ╚═════╝ ╚═╝ ╚═════╝ ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝ ╚═════╝ ');
    console.log('');
    console.log('  Digital Menu API Running...');
    console.log(`  Server running on port ${PORT}`);
    console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Health check: http://localhost:${PORT}/`);
    console.log('');
  });

  // ─────────────────────────────────────────────
  // Graceful Shutdown
  // ─────────────────────────────────────────────
  const shutdown = (signal) => {
    console.log(`\n  [Server] ${signal} received — shutting down gracefully...`);

    server.close(() => {
      console.log('  [Server] All connections closed. Goodbye.\n');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('  [Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    console.error('[UnhandledRejection]', reason);
  });
};

// ─────────────────────────────────────────────
// BOOT SEQUENCE (IMPORTANT ORDER)
// ─────────────────────────────────────────────
const boot = async () => {
  await startDatabase(); // 1. DB first
  startServer();         // 2. Server second
};

// Start everything
boot();