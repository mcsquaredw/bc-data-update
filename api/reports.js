require('dotenv').config();
const moment = require('moment');
const logger = require('logdown')('reports');

const email = require('./email');
const emailTemplateModule = require('./email-template');
const headerTemplate = require('./email-template/header-template');
const reportTemplate = require('./email-template/report-template');

logger.state.isEnabled = true;

module.exports = (db, organisation) => {
  const {
    mailFrom,
    reportsTo,
    techSupportEmail,
    companyLogo,
    name,
  } = organisation;

  async function processDailyReport(reportType, jobs, emailSubject, emailText) {
    let reportRun = await db
      .collection('reports')
      .findOne({ reportType, reportDate: moment().format('DD/MM/YYYY') });
    const inline = [];

    inline.push(`${__dirname}/email-template/img/${companyLogo}`);

    if (!reportRun) {
      reportRun = {
        reportType,
        reportDate: moment().format('DD/MM/YYYY'),
      };

      const emailResult = await email.sendEmail(
        name,
        emailSubject,
        emailText,
        emailTemplateModule(
          name,
          companyLogo,
          techSupportEmail,
          headerTemplate(emailSubject, '#fd9c81'),
          reportTemplate(emailText, jobs),
        ),
        mailFrom,
        reportsTo,
        inline,
      );

      if (emailResult.error) {
        logger.error(`Error while sending email: ${emailResult.error}`);
      } else {
        await db.collection('reports').insertOne(reportRun);
      }
    }
  }

  async function notDelivered(jobs) {
    processDailyReport(
      'notdelivered',
      jobs
        .filter((job) => job.Type.includes('Fitting') && !job.Type.includes('Motor'))
        .filter(
          (job) => job.PlannedStart && moment(job.PlannedStart).isBefore(moment().add(7, 'day')),
        )
        .filter(
          (job) => !job.CurrentFlag
            || (!job.CurrentFlag.includes('Paid') && !job.CurrentFlag.includes('IF01')),
        ),
      'Daily Report - Not Delivered and Fitting Within 7 Days',
      'Doors for the following jobs are not marked as delivered, and are due for fitting in the next 7 days',
    );
  }

  async function noFlag(jobs) {
    processDailyReport(
      'noflag',
      jobs
        .filter((job) => !job.CurrentFlag)
        .filter((job) => job.Type.includes('Fitting'))
        .filter((job) => !job.Type.includes('Motor')),
      'Daily Report - Jobs with No Flag',
      'The following jobs have no flag set - without these flags being set it is difficult to run reports.',
    );
  }

  async function notFinished(jobs) {
    processDailyReport(
      'notfinished',
      jobs
        .filter((job) => job.PlannedStart)
        .filter((job) => moment(job.PlannedStart).isBetween(moment().add(-1, 'days'), moment(), '(]'))
        .filter((job) => !job.RealEnd)
        .filter((job) => job),

      'Daily Report - Jobs Not Completed on Tablets',
      'The following jobs have not been completed on Big Change',
    );
  }

  async function notPaid(jobs) {
    processDailyReport(
      'notpaid',
      jobs
        .filter((job) => job.RealEnd)
        .filter((job) => moment(job.PlannedStart).isBetween(moment().add(-7, 'days'), moment(), '(]'))
        .filter((job) => job.Type.includes('Fitting') || job.Type.includes('Chargeable'))
        .filter((job) => job.CurrentFlag)
        .filter((job) => !job.CurrentFlag.includes('Paid')),

      'Daily Report - Jobs Not Paid (Last 7 Days)',
      'The following jobs have not been marked as Paid',
    );
  }

  function processReports() {
    logger.info('----- BEGIN REPORTS -----');
    db.collection('jobs')
      .find({})
      .toArray()
      .then((jobs) => {
        const filteredJobs = jobs
          .filter((job) => moment(job.PlannedStart).isAfter(moment('27/01/2019', 'DD/MM/YYYY')))
          .sort((a, b) => new Date(a.PlannedStart) - new Date(b.PlannedStart));

        Promise.all([
          noFlag(filteredJobs),
          notDelivered(filteredJobs),
          notFinished(filteredJobs),
          notPaid(filteredJobs),
        ])
          .then(() => {
            logger.info('------ END REPORTS ------');
          })
          .catch((err) => {
            logger.error(`Error processing reports: ${err}`);
          });
      })
      .catch((err) => {
        logger.error(err);
      });
  }

  return {
    processReports,
  };
};
