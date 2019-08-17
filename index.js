const logger = require('logdown')('index');

logger.info('Scheduled jobs platform running');

process.on('SIGINT', (signal) => {
  logger.info(`${signal} - Scheduled jobs platform stopping`);
});
