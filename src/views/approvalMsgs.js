// ─── DM Block Builders ──────────────────────────────────────────────────────

function alexDM(req) {
  const buttonValue = JSON.stringify({
    req_id: req.req_id,
    requester_id: req.requester_slack_id,
  });

  return {
    text: `✨ New headcount wish from <@${req.requester_slack_id}>`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text:
            `*✨ New Headcount Request*\n` +
            `*Req ID:* ${req.req_id}\n` +
            `*Role:* ${req.role_title}\n` +
            `*Headcount:* ${req.headcount}\n` +
            `*Department:* ${req.department}\n` +
            `*Level:* ${req.level}\n` +
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
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve' },
            action_id: 'alex_approve',
            style: 'primary',
            value: buttonValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Approve with Guidance' },
            action_id: 'alex_approve_guidance',
            value: buttonValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '↩️ Return with Questions' },
            action_id: 'alex_return',
            value: buttonValue,
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '❌ Deny' },
            action_id: 'alex_deny',
            style: 'danger',
            value: buttonValue,
          },
        ],
      },
    ],
  };
}

function joshDM(req, alexNotes) {
  const buttonValue = JSON.stringify({
    req_id: req.req_id,
    requester_id: req.requester_slack_id,
  });

  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text:
          `*👑 Headcount Request Awaiting Your Approval*\n` +
          `*Req ID:* ${req.req_id}\n` +
          `*Role:* ${req.role_title}\n` +
          `*Headcount:* ${req.headcount}\n` +
          `*Department:* ${req.department}\n` +
          `*Level:* ${req.level}\n` +
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
  ];

  if (alexNotes) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: `*Alex's Guidance:*\n_${alexNotes}_` },
    });
  }

  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '✅ Approve' },
        action_id: 'josh_approve',
        style: 'primary',
        value: buttonValue,
      },
      {
        type: 'button',
        text: { type: 'plain_text', text: '❌ Reject' },
        action_id: 'josh_reject',
        style: 'danger',
        value: buttonValue,
      },
    ],
  });

  return { text: `👑 Headcount request awaiting your approval`, blocks };
}

// ─── Modal View Builders ─────────────────────────────────────────────────────

function alexGuidanceModal({ req_id, requester_id, response_url }) {
  return {
    type: 'modal',
    callback_id: 'alex_guidance_submit',
    private_metadata: JSON.stringify({ req_id, requester_id, response_url }),
    title: { type: 'plain_text', text: 'Approve with Guidance' },
    submit: { type: 'plain_text', text: 'Submit' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'guidance',
        label: { type: 'plain_text', text: 'Your guidance for the hiring team' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
    ],
  };
}

function alexQuestionsModal({ req_id, requester_id, response_url }) {
  return {
    type: 'modal',
    callback_id: 'alex_questions_submit',
    private_metadata: JSON.stringify({ req_id, requester_id, response_url }),
    title: { type: 'plain_text', text: 'Return with Questions' },
    submit: { type: 'plain_text', text: 'Send' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'questions',
        label: { type: 'plain_text', text: 'Questions for the requester' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
    ],
  };
}

function alexDenyModal({ req_id, requester_id, response_url }) {
  return {
    type: 'modal',
    callback_id: 'alex_deny_submit',
    private_metadata: JSON.stringify({ req_id, requester_id, response_url }),
    title: { type: 'plain_text', text: 'Deny Request' },
    submit: { type: 'plain_text', text: 'Send' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'reason',
        label: { type: 'plain_text', text: 'Reason for denial' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
    ],
  };
}

function joshRejectModal({ req_id, requester_id, response_url }) {
  return {
    type: 'modal',
    callback_id: 'josh_reject_submit',
    private_metadata: JSON.stringify({ req_id, requester_id, response_url }),
    title: { type: 'plain_text', text: 'Reject Request' },
    submit: { type: 'plain_text', text: 'Send' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'input',
        block_id: 'reason',
        label: { type: 'plain_text', text: 'Reason for rejection' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
    ],
  };
}

function resubmitModal({ req_id, questions }) {
  return {
    type: 'modal',
    callback_id: 'requester_resubmit',
    private_metadata: JSON.stringify({ req_id }),
    title: { type: 'plain_text', text: 'Reply & Resubmit' },
    submit: { type: 'plain_text', text: 'Resubmit' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Alex's Questions:*\n${questions}` },
      },
      {
        type: 'input',
        block_id: 'response',
        label: { type: 'plain_text', text: 'Your Response' },
        element: { type: 'plain_text_input', action_id: 'value', multiline: true },
      },
    ],
  };
}

module.exports = {
  alexDM,
  joshDM,
  alexGuidanceModal,
  alexQuestionsModal,
  alexDenyModal,
  joshRejectModal,
  resubmitModal,
};
