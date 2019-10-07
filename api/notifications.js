require('dotenv').config();
const moment = require('moment');
const logger = require('logdown')('notifications');
const email = require('./email');
const emailTemplateModule = require('./email-template');
const headerTemplate = require('./email-template/header-template');
const notificationTemplate = require('./email-template/notification-template');
const utils = require('./utils');

logger.state.isEnabled = true;

module.exports = (db, organisation) => {
  const { mailFrom, notificationsTo, techSupportEmail } = organisation;
  let { companyLogo, name } = organisation;

  async function processNotification(job, emailSubject, emailText, notificationType, colour) {
    try {
      let notificationDocument = await db
        .collection('notifications')
        .findOne({ notificationType, jobId: job.JobId });
      let emailResult;
      const inline = [];

      if (!notificationDocument) {
        notificationDocument = {
          notificationType,
          jobId: job.JobId,
        };

        switch (job.Cust_Company) {
          case 'Chatsworth':
            inline.push(`${__dirname}/email-template/img/chatsworth-logo.png`);
            name = 'Chatsworth Garage Doors';
            companyLogo = 'chatsworth-logo.png';
            break;
          default:
            inline.push(`${__dirname}/email-template/img/${companyLogo}`);
            break;
        }

        emailResult = await email.sendEmail(
          name,
          emailSubject,
          emailText,
          emailTemplateModule(
            name,
            companyLogo,
            techSupportEmail,
            headerTemplate(emailSubject, colour),
            notificationTemplate(job),
          ),
          mailFrom,
          notificationsTo,
          inline,
        );

        if (emailResult.error) {
          logger.error(`Error while sending email: ${emailResult.error}`);
        } else {
          await db.collection('notifications').insertOne(notificationDocument);
        }
      }
    } catch (err) {
      logger.error(`Error while processing notification: ${err}`);
    }
  }

  async function notifySales(jobs) {
    await Promise.all(
      jobs
        .filter((job) => job.Type.includes('Survey'))
        .filter((job) => job.CurrentFlag)
        .filter((job) => job.CurrentFlag.includes('SF03') || job.CurrentFlag.includes('SF04'))
        .map(async (job) => {
          try {
            await processNotification(
              job,
              `New Sale - ${job.Contact} ${job.Postcode}`,
              `<b>${job.Resource}</b> has sold to customer <b>${utils.toTitleCase(
                job.Contact,
              )}</b> at <b>${job.Postcode}</b>
                        <br />`,
              'sales',
              '#83d2c7',
            );
          } catch (err) {
            logger.error(`Error occurred while notifying sales: ${err}`);
          }
        }),
    );
  }

  async function notifyIssues(jobs) {
    await Promise.all(
      jobs
        .filter((job) => job.Type.includes('Remedial') || job.Type.includes('Fitting'))
        .filter((job) => utils.jobHasIssues(job))
        .map(async (job) => {
          try {
            await processNotification(
              job,
              `Job with Issues - ${job.Type} - ${job.Contact} ${job.Postcode}`,
              `<b>${job.Type}</b> for <b>${utils.toTitleCase(job.Contact)}</b> fitted by <b>${
                job.Resource
              }</b>
                        <br />
                        has been marked as <b>Completed with issues</b>
                        <br />
                        <b>Notes</b>
                        ${job.ResNote}
                        <br />
                        ${job.CustNote}
                        <br />
                        Please check the following worksheet data (if available) and take appropriate action:`,
              'issue',
              '#b0c4de',
            );
          } catch (err) {
            logger.error(`Error occurred while notifying issues: ${err}`);
          }
        }),
    );
  }

  function processNotifications() {
    logger.info('----- BEGIN NOTIFICATIONS -----');

    db.collection('jobs')
      .find()
      .toArray()
      .then((jobs) => {
        const filteredJobs = jobs
          .filter((job) => moment(job.PlannedStart).isAfter(moment('03/07/2019', 'DD/MM/YYYY')))
          .filter((job) => job.RealEnd);
        Promise.all([notifyIssues(filteredJobs), notifySales(filteredJobs)])
          .then(() => {
            logger.info('------ END NOTIFICATIONS ------');
          })
          .catch((err) => {
            logger.info(`Error while processing notifications: ${err}`);
          });
      });
  }

  return {
    processNotifications,
  };
};
