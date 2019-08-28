const logger = require('logdown')('header-template');

module.exports = (purpose, colour) => {
  logger.info(`Received purpose ${purpose} and colour ${colour}`);

  const headerTemplate = `
        <tr style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; 
            box-sizing: border-box; 
            font-size: 14px; 
            margin: 0;">
            <td class="alert alert-warning"
                style="font-family: 'Helvetica Neue',Helvetica,Arial,sans-serif; 
                box-sizing: border-box; 
                font-size: 16px; 
                vertical-align: top; 
                color: #fff; 
                font-weight: 500; 
                text-align: center; 
                border-radius: 3px 3px 0 0; 
                background-color: ${colour}; 
                margin: 0; 
                padding: 10px;"
                align="center" 
                bgcolor="${colour}" 
                valign="top">
                ${purpose}
            </td>
        </tr>`;

  return headerTemplate;
};
