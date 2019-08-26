require('dotenv').config();

const assert = require('assert');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('live');
const moment = require('moment');

const schedule = require('../api/schedule');

const now = moment();
const start = now.clone().startOf('day');
const end = start.clone().endOf('day');
const weekday = now.isoWeekday();
const hour = now.hour();

logger.state.isEnabled = true;

if (weekday < 6 && hour > 7 && hour < 19) {
  assert(process.env.mongoDbUri, 'MongoDB URI Not Present');
  assert(process.env.mongoDbName, 'MongoDB Database Name not present');

  MongoClient.connect(process.env.mongoDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }, (dbErr, client) => {
    assert.equal(null, dbErr);

    const db = client.db(process.env.mongoDbName);

    schedule(db).updateRange(
      start,
      end,
    ).then((result) => {
      const { error } = result;

      if (error) {
        logger.error(`Error occurred while retrieving jobs: ${error}`);
      }
    }).catch((err) => {
      logger.error(`Error occurred while updating jobs: ${err}`);
    });
  });
} else {
  logger.info('Will not auto-update jobs for today out of office hours or at weekends - daily past and future job updates will still occur');
}
