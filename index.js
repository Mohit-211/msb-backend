const app = require("./app.js");
const config = require("./src/config/config.js");
const logger = require("./src/config/logger.js");
const sequelize = require("./src/config/central.db.js");

const http = require("http");

const server = http.createServer(app);

server.listen(config.port, () => {
  logger.info(`Listening to port ${config.port}`);
});

// Stop taking requests, let the ones in flight finish, then close the database pool.
// A requested stop (PM2 restart, Ctrl+C) exits with 0; a crash exits with 1 so PM2 restarts the app.
const shutdown = (code) => {
  server.close(async () => {
    await sequelize.close().catch((error) => logger.error(error));
    logger.info("Server closed");
    process.exit(code);
  });
  // Don't wait forever on connections that stay open.
  setTimeout(() => process.exit(code), 10000).unref();
};

// Unexpected error handler
const unexpectedErrorHandler = (error) => {
  logger.error(error);
  shutdown(1);
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);
process.on("SIGTERM", () => shutdown(0));
process.on("SIGINT", () => shutdown(0));
