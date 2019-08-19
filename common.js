const assert = require('assert');
const axios = require('axios');
const moment = require('moment');
const _ = require('lodash');
const logger = require('logdown')('common');

logger.state.isEnabled = true;

module.exports = () => {
  const baseUrl = (username, password, apiKey) => {
    assert(username, 'username must not be empty');
    assert(password, 'password must not be empty');
    assert(apiKey, 'api key must not be empty');

    return `https://webservice.bigchangeapps.com/v01/services.ashx?login=${username}&pwd=${password}&key=${apiKey}`;
  };

  const requestSuccess = (response) => response.status === 200;

  const errorMessage = (name, message) => `${name} - ${message}`;

  const getJobs = async (username, password, apiKey, start, end) => {
    const result = {
      error: null,
      data: null,
    };

    try {
      assert(start, 'start date must be supplied');
      assert(start instanceof moment, 'start date must be instance of moment');
      assert(end, 'end date must be supplied');
      assert(end instanceof moment, 'end date must be instance of moment');

      const response = await axios.get(
        `${baseUrl(username, password, apiKey)}&action=jobs&start=${start.format('YYYY-MM-DD')}&end=${end.format('YYYY-MM-DD HH:mm:ss')}&unallocated=false`,
      );

      if (requestSuccess(response)) {
        logger.info('Get Jobs Request Succeeded');
        result.data = response.data.Result;
      } else {
        logger.error('Get Jobs Request Failed');
        result.error = response.error;
      }
    } catch (err) {
      result.error = errorMessage(err.name, err.message);
    }

    return result;
  };

  const getJobDetails = async (username, password, apiKey, jobId) => {
    const result = {
      error: null,
      data: null,
    };

    try {
      assert(jobId, 'jobId must not be empty');

      const response = _.debounce(await axios.get(
        `${baseUrl(username, password, apiKey)}&action=job&jobid=${jobId}&flaghistory=1`,
      ), 5000);

      if (requestSuccess(response)) {
        result.data = response.data.Result;
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = errorMessage(err.name, err.message);
    }

    return result;
  };

  const getWorksheetsForJob = async (username, password, apiKey, jobId) => {
    const result = {
      error: null,
      data: null,
    };

    try {
      assert(jobId, 'jobId must not be empty');

      const response = _.debounce(await axios.get(
        `${baseUrl(username, password, apiKey)}&action=jobworksheets&jobid=${jobId}&wsPhotos=None`,
      ), 5000);

      if (requestSuccess(response)) {
        result.data = response.data.Result;
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = errorMessage(err.name, err.message);
    }

    return result;
  };

  const getUpdatedJobDetailsByDbId = async (db, dbIds) => {
    const completeFlags = ['Paid', 'SF01', 'SF03', 'SF04'];

    try {
      if (dbIds) {
        Promise.all(
          dbIds.map(async (_id) => {
            const savedJob = await db.collection('jobs').findOne({ _id });

            if (
              (savedJob.Type.includes('Fitting') || savedJob.Type.includes('Survey'))
              && savedJob.RealEnd
              && !completeFlags.find(
                (flag) => savedJob.CurrentFlag && !savedJob.CurrentFlag.includes(flag),
              )
            ) {
              logger.info('Job details and worksheets will be updated');

              const detailsResult = await getJobDetails(savedJob.JobId);
              const worksheetResult = !savedJob.worksheets || savedJob.worksheets.length === 0
                ? await getWorksheetsForJob(savedJob.JobId)
                : { result: savedJob.worksheets };
              const updatedJob = {
                ...savedJob,
                ...detailsResult.result,
                worksheets:
                  worksheetResult.result && worksheetResult.result.length > 0
                    ? worksheetResult.result
                    : [{ Question: 'Worksheets for this job', AnswerText: 'None' }],
              };

              await db.collection('jobs').updateOne({ _id }, { $set: updatedJob });

              logger.info('Job update successful');
              return updatedJob;
            }

            return null;
          }),
        ).catch((err) => {
          logger.error(err);
        });
      }
    } catch (err) {
      logger.error(err);
    }
  };

  const updateDatabase = async (db, jobData) => {
    try {
      const updateJobResult = await db.collection('jobs').bulkWrite(
        jobData.map((job) => {
          const operation = {
            updateOne: {
              filter: { JobId: job.JobId },
              update: { $set: job },
              upsert: true,
            },
          };

          return operation;
        }),
      );
      const { insertedIds, upsertedIds } = updateJobResult;
      const jobsNotDownloaded = await db
        .collection('jobs')
        .find({
          $where: 'if(!this.worksheets || !this.FlagHistory){return this;}',
        })
        .project({ _id: 1 })
        .toArray();

      await getUpdatedJobDetailsByDbId(db, Object.values(insertedIds));
      await getUpdatedJobDetailsByDbId(db, Object.values(upsertedIds));
      await getUpdatedJobDetailsByDbId(db, jobsNotDownloaded.map((job) => job._id));
    } catch (err) {
      logger.error(err);
    }

    return null;
  };

  return {
    getJobs,
    getJobDetails,
    getWorksheetsForJob,
    updateDatabase,
  };
};
