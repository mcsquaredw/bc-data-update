require('dotenv').config();

const logger = require('logdown')('index');

logger.state.isEnabled = true;

const aliveMessage = () => {
  logger.info('Scheduled jobs platform running');
  setTimeout(aliveMessage, 1000 * 60);
};

aliveMessage();

process.on('SIGINT', (signal) => {
  logger.info(`${signal} - Scheduled jobs platform stopping`);

  process.exit();
});
