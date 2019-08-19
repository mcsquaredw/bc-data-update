require('dotenv').config();

const assert = require('assert');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('live');
const moment = require('moment');

const common = require('../common')();

const start = moment().startOf('day');
const end = moment().endOf('day');

logger.state.isEnabled = true;
logger.info(`Checking live jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

assert(process.env.mongoDbUri, 'MongoDB URI Not Present');
assert(process.env.mongoDbName, 'MongoDB Database Name not present');

MongoClient.connect(process.env.mongoDbUri, { useNewUrlParser: true }, (dbErr, client) => {
  assert.equal(null, dbErr);

  const db = client.db(process.env.mongoDbName);

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
      common.updateDatabase(db, data);
      logger.info(`Retrieved job data: ${data instanceof Array ? `${data.length} jobs` : 'No data'}`);
    }
  }).catch((err) => {
    logger.error(`Error occurred: ${err}`);
  });
});
