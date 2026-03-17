const axios = require('axios');
const {
  joshDM,
  alexGuidanceModal,
  alexQuestionsModal,
  alexDenyModal,
  joshRejectModal,
  resubmitModal,
} = require('../views/approvalMsgs');
const { buildInterviewScreen1 } = require('../views/interviewForm');
const { updateReq, getReq } = require('../services/sheets');

// Post to a Slack response_url to update the original message
async function updateOriginalMsg(response_url, text) {
  if (!response_url) return;
  await axios.post(response_url, {
    replace_original: true,
    text,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
  });
}

function register(app) {
  // ── Hiring Lead: Approve ────────────────────────────────────────────────────────
  app.action('alex_approve', async ({ ack, body, respond, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await updateReq(req_id, { status: 'pending_josh', alex_decision: 'approved' });
      const req = await getReq(req_id);

      await client.chat.postMessage({
        channel: process.env.SLACK_USER_EXEC_APPROVER,
        ...joshDM(req, ''),
      });

      await respond({
        replace_original: true,
        text: `✅ You approved *${req.role_title}* (${req_id}). Forwarded to executive approver.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ You approved *${req.role_title}* (\`${req_id}\`). Forwarded to executive approver.`,
            },
          },
        ],
      });
    } catch (err) {
      console.error('alex_approve error:', err);
    }
  });

  // ── Hiring Lead: Approve with Guidance ──────────────────────────────────────────
  app.action('alex_approve_guidance', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: alexGuidanceModal({ req_id, requester_id, response_url: body.response_url }),
      });
    } catch (err) {
      console.error('alex_approve_guidance error:', err);
    }
  });

  app.view('alex_guidance_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id, requester_id, response_url } = JSON.parse(view.private_metadata);
      const guidance = view.state.values.guidance.value.value;

      await updateReq(req_id, {
        status: 'pending_josh',
        alex_decision: 'approved_with_guidance',
        alex_notes: guidance,
      });
      const req = await getReq(req_id);

      await client.chat.postMessage({
        channel: process.env.SLACK_USER_EXEC_APPROVER,
        ...joshDM(req, guidance),
      });

      await updateOriginalMsg(
        response_url,
        `✅ You approved *${req.role_title}* (\`${req_id}\`) with guidance. Forwarded to executive approver.`
      );
    } catch (err) {
      console.error('alex_guidance_submit error:', err);
    }
  });

  // ── Hiring Lead: Return with Questions ──────────────────────────────────────────
  app.action('alex_return', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: alexQuestionsModal({ req_id, requester_id, response_url: body.response_url }),
      });
    } catch (err) {
      console.error('alex_return error:', err);
    }
  });

  app.view('alex_questions_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id, requester_id, response_url } = JSON.parse(view.private_metadata);
      const questions = view.state.values.questions.value.value;

      await updateReq(req_id, {
        status: 'returned',
        alex_decision: 'returned',
        alex_notes: questions,
      });

      const resubmitButtonValue = JSON.stringify({ req_id, questions });

      await client.chat.postMessage({
        channel: requester_id,
        text: `↩️ The hiring lead has some questions about your headcount request.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*↩️ Your headcount request has been returned with questions*\n\n` +
                `*Questions:*\n${questions}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '💬 Reply & Resubmit' },
                action_id: 'open_resubmit_modal',
                style: 'primary',
                value: resubmitButtonValue,
              },
            ],
          },
        ],
      });

      await updateOriginalMsg(
        response_url,
        `↩️ You returned req \`${req_id}\` with questions. Waiting for the requester's response.`
      );
    } catch (err) {
      console.error('alex_questions_submit error:', err);
    }
  });

  // ── Requester: Open resubmit modal ───────────────────────────────────────
  app.action('open_resubmit_modal', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id, questions } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: resubmitModal({ req_id, questions }),
      });
    } catch (err) {
      console.error('open_resubmit_modal error:', err);
    }
  });

  app.view('requester_resubmit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id } = JSON.parse(view.private_metadata);
      const response = view.state.values.response.value.value;
      const userId = body.user.id;

      await updateReq(req_id, { status: 'pending_alex' });
      const req = await getReq(req_id);

      await client.chat.postMessage({
        channel: process.env.SLACK_USER_HIRING_LEAD,
        text: `💬 A requester has responded to your questions about a headcount request.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*💬 Requester Response — ${req.role_title}* (\`${req_id}\`)\n\n` +
                `*Your questions:*\n${req.alex_notes}\n\n` +
                `*<@${userId}>'s response:*\n${response}`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*Full Req Summary:*\n` +
                `*Role:* ${req.role_title} | *Dept:* ${req.department} | *Level:* ${req.level}\n` +
                `*Headcount:* ${req.headcount} | *Salary:* ${req.salary_range}`,
            },
          },
        ],
      });

      await client.chat.postMessage({
        channel: userId,
        text: `✅ Your response has been sent for review. They'll review your req again soon!`,
      });
    } catch (err) {
      console.error('requester_resubmit error:', err);
    }
  });

  // ── Hiring Lead: Deny ───────────────────────────────────────────────────────────
  app.action('alex_deny', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: alexDenyModal({ req_id, requester_id, response_url: body.response_url }),
      });
    } catch (err) {
      console.error('alex_deny error:', err);
    }
  });

  app.view('alex_deny_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id, requester_id, response_url } = JSON.parse(view.private_metadata);
      const reason = view.state.values.reason.value.value;

      await updateReq(req_id, {
        status: 'denied',
        alex_decision: 'denied',
        alex_notes: reason,
      });

      await client.chat.postMessage({
        channel: requester_id,
        text: `❌ Your headcount request has been denied.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*❌ Your headcount request has been denied*\n\n` +
                `*Req ID:* \`${req_id}\`\n` +
                `*Reason:*\n${reason}`,
            },
          },
        ],
      });

      await updateOriginalMsg(
        response_url,
        `❌ You denied req \`${req_id}\`.`
      );
    } catch (err) {
      console.error('alex_deny_submit error:', err);
    }
  });

  // ── Exec Approver: Approve ────────────────────────────────────────────────────────
  app.action('josh_approve', async ({ ack, body, respond, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await updateReq(req_id, { status: 'open', josh_decision: 'approved' });
      const req = await getReq(req_id);

      const interviewButtonValue = JSON.stringify({ req_id });

      await client.chat.postMessage({
        channel: requester_id,
        text: `🎉 Your headcount request has been approved!`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*🎉 Your headcount request has been approved!*\n\n` +
                `*Req ID:* \`${req_id}\`\n` +
                `*Role:* ${req.role_title}\n\n` +
                `Next step: build your interview plan so we can open the role.`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📋 Build Interview Plan' },
                action_id: 'open_interview_plan',
                style: 'primary',
                value: interviewButtonValue,
              },
            ],
          },
        ],
      });

      await respond({
        replace_original: true,
        text: `✅ You approved *${req.role_title}* (\`${req_id}\`). Requester has been notified to build the interview plan.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ You approved *${req.role_title}* (\`${req_id}\`). Requester has been notified to build the interview plan.`,
            },
          },
        ],
      });
    } catch (err) {
      console.error('josh_approve error:', err);
    }
  });

  // ── Exec Approver: Reject ─────────────────────────────────────────────────────────
  app.action('josh_reject', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id, requester_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: joshRejectModal({ req_id, requester_id, response_url: body.response_url }),
      });
    } catch (err) {
      console.error('josh_reject error:', err);
    }
  });

  app.view('josh_reject_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id, requester_id, response_url } = JSON.parse(view.private_metadata);
      const reason = view.state.values.reason.value.value;

      await updateReq(req_id, {
        status: 'denied',
        josh_decision: 'rejected',
        josh_notes: reason,
      });

      await client.chat.postMessage({
        channel: requester_id,
        text: `❌ Your headcount request has been rejected.`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                `*❌ Your headcount request has been rejected*\n\n` +
                `*Req ID:* \`${req_id}\`\n` +
                `*Reason:*\n${reason}`,
            },
          },
        ],
      });

      await updateOriginalMsg(
        response_url,
        `❌ You rejected req \`${req_id}\`.`
      );
    } catch (err) {
      console.error('josh_reject_submit error:', err);
    }
  });

  // ── Requester: Open interview plan ───────────────────────────────────────
  app.action('open_interview_plan', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildInterviewScreen1({ req_id }),
      });
    } catch (err) {
      console.error('open_interview_plan error:', err);
    }
  });
}

module.exports = { register };
