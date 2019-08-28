const moment = require('moment');
const logger = require('logdown')('job-template');

module.exports = (job) => {
  logger.info(`Received job with ID ${job.JobId}`);

  const jobTemplate = `
    <table>
        <tr>
            <td><b>Job Description</b></td>
            <td>    
                ${job.Type}
                <br />
                ${job.Description ? job.Description : ''}
            </td>
        </tr>
        <tr>
            <td><b>Completed by</b></td>
            <td>${job.Resource}</td>
        </tr>
        <tr>
            <td><b>Date and Time</b></td>
            <td>${moment(job.RealEnd).format('DD/MM/YYYY h:mm a')}</td>
        </tr>
        <tr>
            <td><b>Customer Details</b></td>
            <td>${job.Contact} at ${job.Location}</td>
        </tr>
        <tr>
            <td><b>Notes</b></td>
            <td>
                ${
  job.CustNote || job.ResNote
    ? `${job.CustNote}<br />${job.ResNote}`
    : 'No notes provided'
}
            </td>
        </tr>
    </table>
    `;

  return jobTemplate;
};
