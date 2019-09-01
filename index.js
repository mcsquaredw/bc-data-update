/* eslint-disable no-plusplus */
require('dotenv').config();

const assert = require('assert');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('live');
const moment = require('moment');
const { RateLimit } = require('async-sema');

const schedule = require('./api/schedule');
const notifications = require('./api/notifications');
const reports = require('./api/reports');

const limit = RateLimit(1, { timeUnit: 30000 });
const { mongoDbUri, mongoDbName, companyName } = process.env;

logger.state.isEnabled = true;
assert(mongoDbUri, 'MongoDB URI Not Present');
assert(mongoDbName, 'MongoDB Database Name not present');

function update(db, start, end) {
  schedule(db).updateRange(
    start,
    end,
  ).then((result) => {
    const { error } = result;

    if (error) {
      logger.error(`Error occurred while retrieving jobs: ${error}`);
    } else {
      notifications(db).processNotifications();
      reports(db).processReports();
    }
  }).catch((err) => {
    logger.error(`Error occurred while updating jobs: ${err}`);
  });
}

MongoClient.connect(mongoDbUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, (dbErr, client) => {
  assert.equal(null, dbErr);

  const db = client.db(mongoDbName);

  function updateLive() {
    const now = moment();
    const weekday = now.isoWeekday();
    const hour = now.hour();
    const start = now.clone().startOf('day');
    const end = start.clone().endOf('day');

    if (weekday < 6 && hour > 7 && hour < 19) {
      update(db, start, end);
    } else {
      logger.info('Will not auto-update jobs for today out of office hours or at weekends - daily past and future job updates will still occur');
    }

    setTimeout(updateLive, 900000);
  }

  function updateFuture() {
    for (let i = 0; i < 30; i++) {
      const end = moment().add(1 * (i + 1), 'days').endOf('day');
      const start = end.clone().add(-1, 'days').startOf('day');

      limit().then(() => {
        logger.info(`Checking future jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

        schedule(db).updateRange(
          start,
          end,
        ).then((result) => {
          const { error } = result;

          if (error) {
            logger.error(`Error occurred while retrieving jobs: ${error}`);
          } else {
            notifications(db).processNotifications();
            reports(db).processReports();
          }
        }).catch((err) => {
          logger.error(`Error occurred while updating jobs: ${err}`);
        });
      });
    }

    setTimeout(updateFuture, 1000 * 60 * 60 * 24);
  }

  function updatePast() {
    for (let i = 0; i < 30; i++) {
      const start = moment().add(-1 * (i + 1), 'days').startOf('day');
      const end = start.clone().endOf('day');

      limit().then(() => {
        logger.info(`Checking past jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

        schedule(db).updateRange(
          start,
          end,
        ).then((result) => {
          const { error } = result;

          if (error) {
            logger.error(`Error occurred while retrieving jobs: ${error}`);
          } else {
            notifications(db).processNotifications();
            reports(db).processReports();
          }
        }).catch((err) => {
          logger.error(`Error occurred while updating jobs: ${err}`);
        });
      });
    }

    setTimeout(updatePast, 1000 * 60 * 60 * 24);
  }

  updateLive();
  updatePast();
  updateFuture();
});
