require('dotenv').config();

const logger = require('logdown')('live');
const moment = require('moment');
const common = require('../common')();

const start = moment().startOf('day');
const end = moment().endOf('day');

logger.state.isEnabled = true;
logger.info(`Checking live jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

common.getJobs(
  process.env.bcUsername,
  process.env.bcPassword,
  process.env.bcApiKey,
  start,
  end,
).then((results) => {
  const { data, error } = results;

  if (error) {
    logger.error(`Error occurred: ${error}`);
  } else {
    logger.info(`Retrieved job data: ${data instanceof Array ? `${data.length} jobs` : 'No data'}`);
  }
}).catch((err) => {
  logger.error(`Error occurred: ${err}`);
});
