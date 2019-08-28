require('dotenv').config();
const logger = require('logdown')('email');
const mailgunModule = require('mailgun-js');

const { mailgunApiKey, mailgunDomain, from } = process.env;

const mailgun = mailgunModule({ apiKey: mailgunApiKey, domain: mailgunDomain });

module.exports = () => {
  async function sendEmail(companyName, subject, text, html, destination, inline) {
    try {
      const result = await mailgun.messages().send({
        from: `"⚠️ ${companyName} Alerts" <${from}>`,
        to: `${destination}`,
        subject,
        text,
        html,
        inline,
      });

      logger.info(`Sending email to ${destination}`);
      return { error: result.status === 200 };
    } catch (err) {
      logger.error(`Error while sending email: ${err}`);
      return { error: err };
    }
  }

  return {
    sendEmail,
  };
};
