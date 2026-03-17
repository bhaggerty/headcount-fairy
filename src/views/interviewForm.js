function buildInterviewScreen1({ req_id }) {
  return {
    type: 'modal',
    callback_id: 'interview_screen_1',
    private_metadata: JSON.stringify({ req_id }),
    title: { type: 'plain_text', text: '📋 Interview Plan' },
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
      {
        type: 'actions',
        block_id: 'screen1_actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '→ Next: Generate Interview Guide' },
            action_id: 'interview_next_screen',
            style: 'primary',
          },
        ],
      },
    ],
  };
}

function buildInterviewScreen2({ metadata, guide, error = null }) {
  const metaStr =
    typeof metadata === 'string' ? metadata : JSON.stringify(metadata);

  const blocks = [];

  if (error) {
    blocks.push({
      type: 'section',
      block_id: 'error_banner',
      text: { type: 'mrkdwn', text: `:warning: ${error}` },
    });
  }

  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Step 2: Review & Edit Your Interview Guide* 🪄\nThe fairy has crafted a guide based on your panels. Edit freely!',
    },
  });

  blocks.push({
    type: 'input',
    block_id: 'interview_guide',
    label: { type: 'plain_text', text: 'Interview Guide' },
    element: {
      type: 'plain_text_input',
      action_id: 'value',
      multiline: true,
      initial_value: guide || '',
    },
  });

  blocks.push({
    type: 'actions',
    block_id: 'screen2_actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '🔄 Regenerate Guide' },
        action_id: 'regenerate_guide',
      },
    ],
  });

  return {
    type: 'modal',
    callback_id: 'interview_plan_submit',
    private_metadata: metaStr,
    title: { type: 'plain_text', text: '📋 Interview Plan' },
    submit: { type: 'plain_text', text: '✨ Submit Interview Plan' },
    close: { type: 'plain_text', text: 'Back' },
    blocks,
  };
}

module.exports = { buildInterviewScreen1, buildInterviewScreen2 };
