const logger = require('logdown')('report-template');
const moment = require('moment');

module.exports = (explanation, jobs) => {
  logger.info(`Received purpose ${explanation} and jobs list with length ${jobs.length}`);

  const reportTemplate = `
    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
        <td>
            ${explanation}
        <td>
    </tr>
    <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; box-sizing: border-box; font-size: 14px; margin: 0;">
        <td>
        <table style="border: 1px solid black;">
        <tr>
            <td style="padding: 5px; font-weight: bold;">Planned Fitting Date</td>
            <td style="padding: 5px; font-weight: bold;">Job Type</td>
            <td style="padding: 5px; font-weight: bold;">Customer Name</td>
            <td style="padding: 5px; font-weight: bold;">Customer Postcode</td>
            <td style="padding: 5px; font-weight: bold;">Current Flag</td>
        <tr>
        ${jobs
    .map(
      (job, index) => `
                <tr ${index % 2 === 0 ? 'style="background-color: lightgrey"' : ''}>
                    <td style="padding: 5px;">${moment(job.PlannedStart).format('DD/MM/YYYY')}</td>
                    <td style="padding: 5px;">${job.Type}</td>
                    <td style="padding: 5px;">${job.Contact}</td>
                    <td style="padding: 5px;">${job.Postcode}</td>
                    <td style="padding: 5px;">${job.CurrentFlag ? job.CurrentFlag : 'No Flag'}</td>
                </td>
            `,
    )
    .join('')}
        </table>
        </td>
    </tr>
    `;

  return reportTemplate;
};
