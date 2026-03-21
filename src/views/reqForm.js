function buildReqForm({ jd = '', error = null, loading = false } = {}) {
  const blocks = [
    {
      type: 'input',
      block_id: 'role_title',
      label: { type: 'plain_text', text: '✨ What role is your heart wishing for?' },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        placeholder: { type: 'plain_text', text: 'e.g. Senior Software Engineer' },
      },
    },
    {
      type: 'input',
      block_id: 'headcount',
      label: { type: 'plain_text', text: '🔢 How many wishes (headcount)?' },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        placeholder: { type: 'plain_text', text: 'e.g. 2' },
      },
    },
    {
      type: 'input',
      block_id: 'hiring_manager',
      label: { type: 'plain_text', text: '🧙 Who is the hiring manager?' },
      element: { type: 'users_select', action_id: 'value' },
    },
    {
      type: 'input',
      block_id: 'department',
      label: { type: 'plain_text', text: '🏰 Which kingdom (department)?' },
      element: {
        type: 'static_select',
        action_id: 'value',
        options: [
          { text: { type: 'plain_text', text: 'Engineering' }, value: 'Engineering' },
          { text: { type: 'plain_text', text: 'Product' }, value: 'Product' },
          { text: { type: 'plain_text', text: 'Design' }, value: 'Design' },
          { text: { type: 'plain_text', text: 'Sales' }, value: 'Sales' },
          { text: { type: 'plain_text', text: 'Marketing' }, value: 'Marketing' },
          { text: { type: 'plain_text', text: 'Customer Success' }, value: 'CS' },
          { text: { type: 'plain_text', text: 'Other' }, value: 'Other' },
        ],
      },
    },
    {
      type: 'input',
      block_id: 'level',
      label: { type: 'plain_text', text: '🌟 What level(s)?' },
      element: {
        type: 'checkboxes',
        action_id: 'value',
        options: [
          { text: { type: 'plain_text', text: 'Junior (IC1)' }, value: 'Junior' },
          { text: { type: 'plain_text', text: 'Mid-level (IC2)' }, value: 'Mid-level' },
          { text: { type: 'plain_text', text: 'Sr.' }, value: 'Sr.' },
          { text: { type: 'plain_text', text: 'Staff' }, value: 'Staff' },
          { text: { type: 'plain_text', text: 'Principal' }, value: 'Principal' },
          { text: { type: 'plain_text', text: 'Manager' }, value: 'Manager' },
          { text: { type: 'plain_text', text: 'Sr. Manager' }, value: 'Sr. Manager' },
          { text: { type: 'plain_text', text: 'Director' }, value: 'Director' },
          { text: { type: 'plain_text', text: 'VP' }, value: 'VP' },
        ],
      },
    },
    {
      type: 'input',
      block_id: 'salary_range',
      label: { type: 'plain_text', text: '💰 Salary range (the treasure chest)' },
      element: {
        type: 'plain_text_input',
        action_id: 'value',
        placeholder: { type: 'plain_text', text: 'e.g. $120,000–$150,000' },
      },
    },
    {
      type: 'input',
      block_id: 'location',
      label: { type: 'plain_text', text: '🗺️ Where in the realm (location)?' },
      element: {
        type: 'checkboxes',
        action_id: 'value',
        options: [
          { text: { type: 'plain_text', text: 'Portland' }, value: 'Portland' },
          { text: { type: 'plain_text', text: 'Fully Remote' }, value: 'Fully Remote' },
          { text: { type: 'plain_text', text: 'Hybrid' }, value: 'Hybrid' },
          { text: { type: 'plain_text', text: 'New York' }, value: 'New York' },
          { text: { type: 'plain_text', text: 'San Francisco' }, value: 'San Francisco' },
        ],
      },
    },
  ];

  if (loading) {
    blocks.push({
      type: 'section',
      block_id: 'loading_banner',
      text: { type: 'mrkdwn', text: '🪄 _Generating your job description... hang tight!_' },
    });
  }

  if (error) {
    blocks.push({
      type: 'section',
      block_id: 'error_banner',
      text: { type: 'mrkdwn', text: `:warning: ${error}` },
    });
  }

  // JD input — must be an `input` block so it appears in view.state.values
  blocks.push({
    type: 'input',
    block_id: 'job_description',
    optional: true,
    label: { type: 'plain_text', text: '📜 Job Description' },
    hint: { type: 'plain_text', text: 'Write your own, or let the fairy craft one for you!' },
    element: {
      type: 'plain_text_input',
      action_id: 'value',
      multiline: true,
      initial_value: jd,
      placeholder: { type: 'plain_text', text: 'Describe the role, responsibilities, and requirements…' },
    },
  });

  // AI button lives in an actions block — it does NOT appear in view.state.values
  blocks.push({
    type: 'actions',
    block_id: 'ai_actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '🪄 Create one with AI' },
        action_id: 'generate_jd_ai',
        style: 'primary',
      },
    ],
  });

  return {
    type: 'modal',
    callback_id: 'req_form_submit',
    title: { type: 'plain_text', text: '🧚 Headcount Fairy' },
    submit: { type: 'plain_text', text: 'Grant my wish!' },
    close: { type: 'plain_text', text: 'Maybe later' },
    blocks,
  };
}

module.exports = { buildReqForm };
