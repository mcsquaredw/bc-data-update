const assert = require('assert');
const axios = require('axios');
const moment = require('moment');

module.exports = () => {
  const baseUrl = (username, password, apiKey) => {
    assert(username, 'username must not be set');
    assert(password, 'password must not be empty');
    assert(apiKey, 'api key must not be empty');

    return `https://webservice.bigchangeapps.com/v01/services.ashx?login=${username}&pwd=${password}&key=${apiKey}`;
  };

  const requestSuccess = (response) => response.status === 200;

  const getJobs = async (username, password, apiKey, start, end) => {
    const result = {
      error: null,
      data: null,
    };

    try {
      assert(start instanceof moment, 'start must be instance of moment');
      assert(end instanceof moment, 'end must be instance of moment');

      const response = await axios.get(
        `${baseUrl(username, password, apiKey)}&action=jobs&start=${start.format('YYYY-MM-DD')}&end=${end.format('YYYY-MM-DD')}`,
      );

      if (requestSuccess(response)) {
        result.data = response.data.Result;
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = err;
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

      const response = await axios.get(
        `${baseUrl(username, password, apiKey)}&action=job&jobid=${jobId}&flaghistory=1`,
      );

      if (requestSuccess(response)) {
        result.data = response.data.Result;
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = err;
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

      const response = await axios.get(
        `${baseUrl(username, password, apiKey)}&action=jobworksheets&jobid=${jobId}&wsPhotos=None`,
      );

      if (requestSuccess(response)) {
        result.data = response.data.Result;
      } else {
        result.error = response.error;
      }
    } catch (err) {
      result.error = err;
    }

    return result;
  };

  return {
    getJobs,
    getJobDetails,
    getWorksheetsForJob,
  };
};
