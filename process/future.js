require('dotenv').config();

const assert = require('assert');
const _ = require('lodash');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('future');
const moment = require('moment');

const common = require('../common')();

logger.state.isEnabled = true;

assert(process.env.mongoDbUri, 'MongoDB URI Not Present');
assert(process.env.mongoDbName, 'MongoDB Database Name not present');

MongoClient.connect(process.env.mongoDbUri, { useNewUrlParser: true }, (dbErr, client) => {
  assert.equal(null, dbErr);

  const db = client.db(process.env.mongoDbName);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 4; i++) {
    const end = moment().add(7 * (i + 1), 'days').endOf('day');
    const start = end.clone().add(-7, 'days').startOf('day');

    logger.info(`Checking future jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

    _.throttle(() => common.getJobs(
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
        common.updateDatabase(db, data);
      }
    }).catch((err) => {
      logger.error(`Error occurred: ${err}`);
    }), 60000)();
  }
});
