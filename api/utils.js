module.exports = {
  toTitleCase: (str) => str.replace(/(?:^|\s)\w/g, (match) => match.toUpperCase()),
  jobHasIssues: (job) => {
    if (job.Status.includes('issues')) {
      return true;
    }

    if (job.worksheets) {
      const issueWithJob = job.worksheets.find((worksheetQn) => worksheetQn.Question.toUpperCase().includes('ANY ISSUES WITH THE JOB'));

      if (issueWithJob) {
        return issueWithJob.AnswerText.toUpperCase().includes('TRUE');
      }

      const revisitRequired = job.worksheets.find((worksheetQn) => worksheetQn.Question.toUpperCase().includes('ANY ISSUES WITH THE JOB'));

      if (revisitRequired) {
        return revisitRequired.AnswerText.toUpperCase().includes('TRUE');
      }
    }

    return false;
  },
};
