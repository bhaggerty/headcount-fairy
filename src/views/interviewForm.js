function buildInterviewScreen1({ req_id }) {
  return {
    type: 'modal',
    callback_id: 'interview_screen_1',
    private_metadata: JSON.stringify({ req_id }),
    title: { type: 'plain_text', text: '📋 Interview Plan' },
    submit: { type: 'plain_text', text: 'Generate Guide' },
    close: { type: 'plain_text', text: 'Close' },
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Step 1: Build Your Interview Panel* 🎭\nSelect who will interview candidates at each stage.',
        },
      },
      {
        type: 'input',
        block_id: 'phone_screeners',
        label: { type: 'plain_text', text: '📞 Phone Screeners' },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Select screeners' },
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Panel 1*' },
      },
      {
        type: 'input',
        block_id: 'panel_1_title',
        label: { type: 'plain_text', text: 'Panel Title' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'e.g. Technical Assessment' },
        },
      },
      {
        type: 'input',
        block_id: 'panel_1_interviewers',
        label: { type: 'plain_text', text: 'Interviewers' },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Select interviewers' },
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Panel 2 (optional)*' },
      },
      {
        type: 'input',
        block_id: 'panel_2_title',
        optional: true,
        label: { type: 'plain_text', text: 'Panel Title' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'e.g. Culture & Values' },
        },
      },
      {
        type: 'input',
        block_id: 'panel_2_interviewers',
        optional: true,
        label: { type: 'plain_text', text: 'Interviewers' },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Select interviewers' },
        },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Panel 3 (optional)*' },
      },
      {
        type: 'input',
        block_id: 'panel_3_title',
        optional: true,
        label: { type: 'plain_text', text: 'Panel Title' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'e.g. Leadership & Collaboration' },
        },
      },
      {
        type: 'input',
        block_id: 'panel_3_interviewers',
        optional: true,
        label: { type: 'plain_text', text: 'Interviewers' },
        element: {
          type: 'multi_users_select',
          action_id: 'value',
          placeholder: { type: 'plain_text', text: 'Select interviewers' },
        },
      },
      { type: 'divider' },
    ],
  };
}

function buildInterviewSubmitModal({ req_id }) {
  return {
    type: 'modal',
    callback_id: 'interview_plan_submit',
    private_metadata: JSON.stringify({ req_id }),
    title: { type: 'plain_text', text: '📋 Submit Plan' },
    submit: { type: 'plain_text', text: 'Submit Plan' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: "✅ Ready to submit? Add any notes below, then hit *Submit Plan*." },
      },
      {
        type: 'input',
        block_id: 'notes',
        optional: true,
        label: { type: 'plain_text', text: 'Notes (optional)' },
        element: {
          type: 'plain_text_input',
          action_id: 'value',
          multiline: true,
          placeholder: { type: 'plain_text', text: 'e.g. Skip panel 2 for junior candidates…' },
        },
      },
    ],
  };
}

module.exports = { buildInterviewScreen1, buildInterviewSubmitModal };
