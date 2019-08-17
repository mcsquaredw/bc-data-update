const moment = require('moment');
const { expect } = require('chai');
const common = require('../common')();

describe('common', () => {
  describe('#getJobs()', () => {
    it('should return an error if username is not supplied', () => common.getJobs('', 'password', 'api-key', moment(), moment()).then((result) => {
      expect(result.error).to.include('username must not be empty');
    }));
    it('should return an error if password is not supplied', () => common.getJobs('username', '', 'api-key', moment(), moment()).then((result) => {
      expect(result.error).to.include('password must not be empty');
    }));
    it('should return an error if API key is not supplied', () => common.getJobs('username', 'password', '', moment(), moment()).then((result) => {
      expect(result.error).to.include('api key must not be empty');
    }));
    it('should return an error if start date is not supplied', () => common.getJobs('username', 'password', 'api-key', null, moment()).then((result) => {
      expect(result.error).to.include('start date must be supplied');
    }));
    it('should return an error if start date is not a Moment object', () => common.getJobs('username', 'password', 'api-key', {}, moment()).then((result) => {
      expect(result.error).to.include('start date must be instance of moment');
    }));
    it('should return an error if end date is not supplied', () => common.getJobs('username', 'password', 'api-key', moment(), null).then((result) => {
      expect(result.error).to.include('end date must be supplied');
    }));
    it('should return an error if end date is not a Moment object', () => common.getJobs('username', 'password', 'api-key', moment(), {}).then((result) => {
      expect(result.error).to.include('end date must be instance of moment');
    }));
  });
});
