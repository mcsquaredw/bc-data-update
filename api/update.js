const { RateLimit } = require('async-sema');

require('dotenv').config();
const logger = require('logdown')('update');
const bigChange = require('./big-change')(process.env.bcUsername, process.env.bcPassword, process.env.bcApiKey);

const completeFlags = ['Paid', 'SF01', 'SF03', 'SF04', 'Warranty'];
const jobTypes = ['Fitting', 'Survey', 'Remedial'];

logger.state.isEnabled = true;

const limit = RateLimit(1, {
  timeUnit: 2500,
});

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

module.exports = {
  updateJobDetails,
  updateJobWorksheets,
  updateJob,
};
