'use strict';

const dotenv = require('dotenv');

// Load environment variables before importing app
dotenv.config();

const app  = require('./app');
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Boot
// ─────────────────────────────────────────────

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
// Ensures in-flight requests finish before the
// process exits (important in production / containers).
// ─────────────────────────────────────────────

const shutdown = (signal) => {
  console.log(`\n  [Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    console.log('  [Server] All connections closed. Goodbye.\n');
    process.exit(0);
  });

  // Force-kill if shutdown takes longer than 10 s
  setTimeout(() => {
    console.error('  [Server] Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Catch unhandled promise rejections so they don't silently swallow errors
process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason);
  // Optionally: shutdown('unhandledRejection');
});