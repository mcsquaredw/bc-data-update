/* eslint-disable no-underscore-dangle */
require('dotenv').config();

const { diff } = require('deep-object-diff');
const logger = require('logdown')('schedule');

const update = require('./update');
const bigChange = require('./big-change');

logger.state.isEnabled = true;

module.exports = (db) => {
  const updateRange = async (start, end, organisation) => {
    const result = {
      error: null,
    };

    logger.info(`----- UPDATE ${start.format('DD/MM/YYYY HH:mm:ss')} to ${end.format('DD/MM/YYYY HH:mm:ss')}`);
    try {
      const { bcUsername, bcPassword, bcApiKey } = organisation;
      const { data, err } = await bigChange(bcUsername, bcPassword, bcApiKey).getJobs(start, end);
      await update(bcUsername, bcPassword, bcApiKey).getFlags(db);
      await update(bcUsername, bcPassword, bcApiKey).getResources(db);

      if (!err && data instanceof Array) {
        const todayUpdates = data.map(async (newJob) => {
          const savedJob = await db.collection('jobs').findOne({ JobId: newJob.JobId });
          const updatedJob = await update(bcUsername, bcPassword, bcApiKey).updateJob({
            ...savedJob,
            ...newJob,
          });

          if (diff(savedJob, {
            ...updatedJob,
          })) {
            return {
              updateOne: {
                filter: { JobId: newJob.JobId },
                update: { $set: { ...updatedJob } },
                upsert: true,
              },
            };
          }

          return null;
        });

        const updateOperations = await Promise.all(todayUpdates);

        await db.collection('jobs').bulkWrite(updateOperations.filter((op) => op));
      } else {
        result.error = err;
      }
    } catch (err) {
      result.error = err;
    }

    logger.info(`----- END UPDATE ${start.format('DD/MM/YYYY HH:mm:ss')} to ${end.format('DD/MM/YYYY HH:mm:ss')}`);

    return result;
  };

  return {
    updateRange,
  };
};
