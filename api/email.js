require('dotenv').config();
const logger = require('logdown')('email');
const sgMail = require('@sendgrid/mail');

const { SENDGRID_API_KEY } = process.env;

sgMail.setApiKey(SENDGRID_API_KEY);

logger.state.isEnabled = true;

async function sendEmail(companyName, subject, text, html, from, destination, inline) {
  const msg = {
    to: destination,
    from: `"⚠️ ${companyName} Alerts" <${from}>`,
    subject,
    text,
    html,
  };
  const result = {
    error: null,
    sent: false,
  };

  try {
    logger.info('Attempting to send email');
    await sgMail.send(msg);

    result.sent = true;
  } catch (err) {
    logger.error(`Error while sending email: ${err}`);
    result.error = err;
  }

  return result;
}

module.exports = {
  sendEmail,
};
