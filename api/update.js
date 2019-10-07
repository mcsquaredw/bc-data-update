require('dotenv').config();

const { RateLimit } = require('async-sema');
const logger = require('logdown')('update');
const bigChangeModule = require('./big-change');

const completeFlags = ['Paid', 'SF01', 'SF03', 'SF04', 'Warranty'];
const jobTypes = ['Fitting', 'Survey', 'Remedial'];

logger.state.isEnabled = true;

module.exports = (username, password, apiKey) => {
  const bigChange = bigChangeModule(username, password, apiKey);
  const limit = RateLimit(1, {
    timeUnit: 2500,
  });

  const getFlags = async (db) => {
    logger.info('----- BEGIN FLAG UPDATE -----');
    try {
      const response = await bigChange.getFlags();

      if (response.error) {
        logger.error(`Error getting flags from Big Change: ${response.error}`);
      } else {
        const flags = response.result;

        await db.collection('flags').deleteMany({});
        await db.collection('flags').insertMany(flags);
      }
    } catch (err) {
      logger.error(`Error getting flags: ${err}`);
    } finally {
      logger.info('----- END FLAG UPDATE -----');
    }
  };

  const getResources = async (db) => {
    logger.info('----- BEGIN RESOURCE UPDATE -----');
    try {
      const response = await bigChange.getResources();

      if (response.error) {
        logger.error(`Error getting resources from Big Change: ${response.error}`);
      } else {
        const resources = response.result;

        if (resources instanceof Array) {
          Promise.all(
            resources.map(async (resource) => db.collection('resources').updateOne({ ResourceName: resource.ResourceName }, { $set: { ...resource } }, { upsert: true })),
          ).catch((err) => {
            logger.error(`Error while updating resources: ${err}`);
          });
        }
      }
    } catch (err) {
      logger.error(`Error getting resources: ${err}`);
    } finally {
      logger.info('----- END RESOURCE UPDATE -----');
    }
  };

  const updateJobDetails = async (job) => {
    await limit();

    const { error, data } = await bigChange.getJobDetails(job.JobId);

    if (error) {
      logger.error(`Error occurred while retrieving job details: ${error}`);

      return {
        ...job,
      };
    }

    logger.info(`Details retrieved for job with ID ${job.JobId}`);

    return {
      ...job,
      ...data,
    };
  };

  const updateJobWorksheets = async (job) => {
    await limit();

    const { error, data } = await bigChange.getWorksheetsForJob(job.JobId);

    if (error) {
      logger.error(`Error occurred while retrieving job details: ${error}`);

      return job;
    }

    if (data instanceof Array && data.length === 0) {
      return {
        ...job,
        worksheets: [{
          Question: 'No Worksheets',
          AnswerText: '',
        }],
      };
    }
    logger.info(`Details retrieved for job with ID ${job.JobId}`);

    return {
      ...job,
      worksheets: data,
    };
  };

  const updateJob = async (job) => {
    let updatedJob = {
      ...job,
    };

    if (jobTypes.find((jobType) => job.Type && job.Type.includes(jobType))) {
      if (job.RealEnd) {
        if (!completeFlags.find((flag) => job.CurrentFlag && job.CurrentFlag.includes(flag))) {
          updatedJob = {
            ...updatedJob,
            ...await updateJobDetails(await updateJobWorksheets(job)),
          };
        } else {
          if (!job.worksheets) {
            updatedJob = {
              ...updatedJob,
              ...await updateJobWorksheets(job),
            };
          }
          if (!job.FlagHistory) {
            updatedJob = {
              ...updatedJob,
              ...await updateJobDetails(job),
            };
          }
        }
      }
    }

    return updatedJob;
  };

  return {
    updateJobDetails,
    updateJobWorksheets,
    updateJob,
    getFlags,
    getResources,
  };
};
