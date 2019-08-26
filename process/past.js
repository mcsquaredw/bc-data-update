require('dotenv').config();

const assert = require('assert');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('past');
const moment = require('moment');
const { RateLimit } = require('async-sema');

const notifications = require('../notifications');
const schedule = require('../api/schedule');

logger.state.isEnabled = true;

assert(process.env.mongoDbUri, 'MongoDB URI Not Present');
assert(process.env.mongoDbName, 'MongoDB Database Name not present');

MongoClient.connect(process.env.mongoDbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, (dbErr, client) => {
  assert.equal(null, dbErr);
  const limit = RateLimit(1, { timeUnit: 30000 });
  const db = client.db(process.env.mongoDbName);

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < 30; i++) {
    const start = moment().add(-1 * (i + 1), 'days').startOf('day');
    const end = start.clone().endOf('day');

    logger.info(`Checking past jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

    limit().then(() => {
      schedule(db).updateRange(
        start,
        end,
      ).then((result) => {
        const { error } = result;

        if (!error) {
          notifications(db).processNotifications();
        } else {
          logger.error(`Error occurred while retrieving jobs: ${error}`);
        }
      }).catch((err) => {
        logger.error(`Error occurred while updating jobs: ${err}`);
      });
    });
  }
});
