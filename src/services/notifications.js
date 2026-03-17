const DEPT_ROUTING = {
  Engineering: () => process.env.SLACK_USER_TECH_RECRUITER,
  Product: () => process.env.SLACK_USER_TECH_RECRUITER,
  Design: () => process.env.SLACK_USER_TECH_RECRUITER,
  Sales: () => process.env.SLACK_USER_GTM_RECRUITER,
  Marketing: () => process.env.SLACK_USER_GTM_RECRUITER,
  CS: () => process.env.SLACK_USER_GTM_RECRUITER,
};

async function dmCoordinator(client, text) {
  await client.chat.postMessage({
    channel: process.env.SLACK_USER_TALENT_COORDINATOR,
    text,
  });
}

async function dmCoordinatorError(client, err, req) {
  await dmCoordinator(
    client,
    `⚠️ *Headcount Fairy Error*\n${err.message}\n\nReq data:\n\`\`\`${JSON.stringify(req, null, 2)}\`\`\``
  );
}

async function routeToRecruiter(client, req) {
  const recruiterIdFn = DEPT_ROUTING[req.department];
  const recruiterId = recruiterIdFn
    ? recruiterIdFn()
    : process.env.SLACK_USER_GENERAL_RECRUITER;

  await client.chat.postMessage({
    channel: recruiterId,
    text: `🧚 New headcount req routed to you: ${req.role_title} (${req.req_id})`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*🧚 New Headcount Request — ${req.role_title}*\n` +
            `*Req ID:* ${req.req_id}\n` +
            `*Department:* ${req.department}\n` +
            `*Level:* ${req.level}\n` +
            `*Headcount:* ${req.headcount}\n` +
            `*Salary Range:* ${req.salary_range}\n` +
            `*Location:* ${req.location}\n` +
            `*Hiring Manager:* <@${req.hiring_manager_slack_id}>\n` +
            `*Requested by:* <@${req.requester_slack_id}>`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Job Description:*\n${req.job_description || '_No description provided_'}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Interview Guide:*\n${req.interview_guide || '_No guide yet_'}`,
        },
      },
    ],
  });
}

module.exports = { dmCoordinator, dmCoordinatorError, routeToRecruiter };
