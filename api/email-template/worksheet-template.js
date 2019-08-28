const logger = require('logdown')('worksheet-template');

module.exports = (worksheetData) => {
  if (worksheetData && Array.isArray(worksheetData)) {
    logger.info(`Received worksheet data of length ${worksheetData.length}`);

    let element = '';
    const worksheetTemplate = `
        <table>
            ${worksheetData
    .sort((a, b) => a.QuestionOrder - b.QuestionOrder)
    .map((question) => {
      if (!question.AnswerPhoto) {
        if (question.AnswerText === 'true') {
          element = 'Yes';
        } else if (question.AnswerText === 'false') {
          element = 'No';
        } else {
          element = `${question.AnswerText}`;
        }

        return `
          <tr>
            <td>
              <b>${question.Question}</b>
            </td>
            <td>
              ${element}
            </td>
          </tr>`;
      }
      return '';
    })
    .join('')}
    </table>`;

    return worksheetTemplate;
  }

  logger.info('No worksheet data sent to template');
  return '<b>No worksheet data provided</b>';
};
