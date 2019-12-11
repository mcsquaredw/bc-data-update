/* eslint-disable no-plusplus */
require('dotenv').config();

const http = require('http');
const assert = require('assert');
const { MongoClient } = require('mongodb');
const logger = require('logdown')('index');
const moment = require('moment');
const { RateLimit } = require('async-sema');

const schedule = require('./api/schedule');
const notifications = require('./api/notifications');
const reports = require('./api/reports');

const port = process.env.PORT || 3001;

const limit = RateLimit(1, { timeUnit: 30000 });
const { MONGODB_URI, MONGODB_DBNAME } = process.env;

logger.state.isEnabled = true;

function update(db, start, end, organisation, updateFlags, updateResources) {
  schedule(db).updateRange(
    start,
    end,
    organisation,
    updateFlags,
    updateResources,
  ).then((result) => {
    const { error } = result;

    if (error) {
      logger.error(`Error occurred while retrieving jobs: ${error}`);
    } else {
      notifications(db, organisation).processNotifications();
      reports(db, organisation).processReports();
    }
  }).catch((err) => {
    logger.error(`Error occurred while updating jobs: ${err}`);
  });
}

MongoClient.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}, (dbErr, client) => {
  assert.equal(null, dbErr);

  const db = client.db(MONGODB_DBNAME);

  function updateLive(organisation, updateFlags, updateResources) {
    const now = moment();
    const weekday = now.isoWeekday();
    const hour = now.hour();
    const start = now.clone().startOf('day');
    const end = start.clone().endOf('day');

    if (weekday < 6 && hour > 7 && hour < 19) {
      update(db, start, end, organisation, updateFlags, updateResources);
    } else {
      logger.info('Will not auto-update jobs for today out of office hours or at weekends - daily past and future job updates will still occur');
    }

    setTimeout(() => {
      updateLive(organisation, false, true);
    }, 900000);
  }

  function updateFuture(organisation) {
    for (let i = 0; i < 30; i++) {
      const end = moment().add(1 * (i + 1), 'days').endOf('day');
      const start = end.clone().add(-1, 'days').startOf('day');

      limit().then(() => {
        logger.info(`Checking future jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

        schedule(db).updateRange(
          start,
          end,
          organisation,
        ).then((result) => {
          const { error } = result;

          if (error) {
            logger.error(`Error occurred while retrieving jobs: ${error}`);
          } else {
            notifications(db, organisation).processNotifications();
            reports(db, organisation).processReports();
          }
        }).catch((err) => {
          logger.error(`Error occurred while updating jobs: ${err}`);
        });
      });
    }

    setTimeout(() => {
      updateFuture(organisation);
    }, 1000 * 60 * 60 * 24);
  }

  function updatePast(organisation) {
    for (let i = 0; i < 30; i++) {
      const start = moment().add(-1 * (i + 1), 'days').startOf('day');
      const end = start.clone().endOf('day');

      limit().then(() => {
        logger.info(`Checking past jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);

        schedule(db).updateRange(
          start,
          end,
          organisation,
        ).then((result) => {
          const { error } = result;

          if (error) {
            logger.error(`Error occurred while retrieving jobs: ${error}`);
          } else {
            notifications(db, organisation).processNotifications();
            reports(db, organisation).processReports();
          }
        }).catch((err) => {
          logger.error(`Error occurred while updating jobs: ${err}`);
        });
      });
    }

    setTimeout(() => {
      updatePast(organisation);
    }, 1000 * 60 * 60 * 24);
  }

  db.collection('organisations').find({}).toArray()
    .then((organisations) => {
      organisations.forEach((organisation) => {
        updateLive(organisation);
        updatePast(organisation);
        updateFuture(organisation);
      });
    })
    .catch((err) => {
      logger.error(`Error while getting organisations: ${err}`);
    });
});

http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('App running');
}).listen(port, () => {
  logger.info('App running');
});
