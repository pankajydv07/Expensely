const app = require('./app');
const { pool } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\n🛑 Received shutdown signal, closing server gracefully...');
  
  try {
    // Close database connections
    await pool.end();
    console.log('✅ Database connections closed');
    
    // Exit process
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const server = app.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║                                              ║
║   🚀  Expensely API Server Started           ║
║                                              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                      ║
║   Server: http://${HOST}:${PORT}              ║
║   Health: http://${HOST}:${PORT}/health       ║
║                                              ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = server;

