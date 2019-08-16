const logger = require('logdown')('live');
const moment = require('moment');

const common = require('../common');

const start = moment().startOf('day');
const end = moment().endOf('day');

logger.state.isEnabled = true;
logger.info(`Checking live jobs for updates between ${start.format('DD/MM/YYYY h:mm:ss')} and ${end.format('DD/MM/YYYY h:mm:ss')}`);
