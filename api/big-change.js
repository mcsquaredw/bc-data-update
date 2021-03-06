const assert = require('assert');
const axios = require('axios');
const moment = require('moment');
const logger = require('logdown')('big-change');
const { RateLimit } = require('async-sema');

logger.state.isEnabled = true;

module.exports = (username, password, apiKey) => {
  const limit = RateLimit(1, { timeUnit: 5000 });
  const baseUrl = `https://webservice.bigchangeapps.com/v01/services.ashx?login=${username}&pwd=${password}&key=${apiKey}`;
  const requestSuccess = (response) => response.status === 200;
  const errorMessage = (name, message) => `${name} - ${message}`;

  const getFlags = async () => {
    let error;
    let result;

    try {
      logger.info('Getting flags');

      const response = await axios.get(`${baseUrl}&action=tags`);

      if (response.status === 200) {
        result = response.data.Result;
      } else {
        ({ error } = { response });
        logger.error(error);
      }
    } catch (err) {
      error = err;
    }

    return {
      error,
      result,
    };
  };

  const getJobs = async (start, end) => {
    const result = {
      error: null,
      data: null,
    };

    try {
      assert.notEqual(start, null, 'start date must be supplied');
      assert(start instanceof moment, 'start date must be instance of moment');
      assert.notEqual(end, null, 'end date must be supplied');
      assert(end instanceof moment, 'end date must be instance of moment');

      await limit();

      const response = await axios.get(
        `${baseUrl}&action=jobs&start=${start.format('YYYY-MM-DD')}&end=${end.format('YYYY-MM-DD HH:mm:ss')}&unallocated=false`,
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

  const getJobDetails = async (jobId) => {
    const result = {
      error: null,
      data: null,
    };

    logger.info(`Getting extended Job Details for Job ID ${jobId}`);

    try {
      assert.notEqual(jobId, null, 'jobId must not be empty');

      await limit();

      const response = await axios.get(
        `${baseUrl}&action=job&jobid=${jobId}&flaghistory=1`,
      );

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

  const getWorksheetsForJob = async (jobId) => {
    const result = {
      error: null,
      data: null,
    };

    logger.info(`Getting worksheets for Job ID ${jobId}`);

    try {
      assert(jobId, 'jobId must not be empty');

      await limit();

      const response = await axios.get(
        `${baseUrl}&action=jobworksheets&jobid=${jobId}&wsPhotos=None`,
      );

      if (requestSuccess(response)) {
        result.data = response.data.Result;

        logger.info(`Worksheet answers retrieved: ${result.data instanceof Array ? result.data.length : 'None'}`);
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = errorMessage(err.name, err.message);
    }

    return result;
  };

  const getResources = async () => {
    let error;
    let result;

    try {
      logger.info('Getting resources');

      const response = await axios.get(`${baseUrl}&action=live`);

      if (response.status === 200) {
        result = response.data.Result;
      } else {
        ({ error } = { response });
        logger.error(error);
      }
    } catch (err) {
      error = err;
    }

    return {
      error,
      result,
    };
  };

  return {
    getJobs,
    getJobDetails,
    getWorksheetsForJob,
    getFlags,
    getResources,
  };
};
