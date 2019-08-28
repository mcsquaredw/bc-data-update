const logger = require('logdown')('notification-template');
const worksheetTemplate = require('./worksheet-template');
const jobTemplate = require('./job-template');

module.exports = (job) => {
  logger.info(`Received job with ID ${job.JobId}`);

  const notificationTemplate = `
    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
        <td>
            ${jobTemplate(job)}
        <td>
    </tr>
    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
        <td>
            ${worksheetTemplate(job.worksheets)}
        </td>
    </tr>
    `;

  return notificationTemplate;
};
