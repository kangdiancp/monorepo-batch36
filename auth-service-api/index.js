//global variable
require('dotenv').config();

const app = require('./src/app');
const appConfig = require('./config');
const { connectDB, closeDB } = require('./src/shared/utils/db');

let server;

//Start Server
const startServer = async () => {
  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await connectDB();

    const PORT = appConfig.app.port || 3000;

    server = app.listen(PORT, () => {
      const swaggerLine = `  Swagger : http://localhost:${PORT}/api-docs`;
      console.log('');
      console.log('        AUTH-API-SERVICE — RUNNING          ');
      console.log(`  Port    : ${String(PORT).padEnd(29)}`);
      console.log(`  Env     : ${String(appConfig.app.env).padEnd(29)}`);
      console.log(`  Prefix  : ${String(appConfig.app.prefix).padEnd(29)}`);
      console.log(swaggerLine.padEnd(42) + '  ');
      console.log('');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

//Graceful Shutdown 
const gracefulShutdown = (signal) => {
  console.log(`\n ${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.closeAllConnections?.();
    server.close(async () => {
      console.log('Express server closed.');
      await shutdownDependencies();
    });
  } else {
    // Server belum sempat listen — langsung tutup DB
    shutdownDependencies();
  }
};

//Close DB Pool
const shutdownDependencies = async () => {
  try {
    console.log('🔌 Closing PostgreSQL connection pool...');

    if (typeof closeDB === 'function') {
      await closeDB();
      console.log('PostgreSQL pool closed successfully.');
    } else {
      console.log('closeDB function not found in db.js');
    }

    console.log('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error.message);
    process.exit(1);
  }
};

//Force exit jika shutdown menggantung 
const setupTimeout = () => {
  setTimeout(() => {
    console.error('Forcefully shutting down due to timeout');
    process.exit(1);
  }, 10000).unref();
};

//Signal listeners
process.on('SIGINT', () => {
  setupTimeout();
  gracefulShutdown('SIGINT');
});

process.on('SIGTERM', () => {
  setupTimeout();
  gracefulShutdown('SIGTERM');
});

// Hanya log — tidak langsung shutdown
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);
});

// Error fatal — harus shutdown
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  setupTimeout();
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

//Run
startServer();