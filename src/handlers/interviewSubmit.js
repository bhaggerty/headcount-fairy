const { buildInterviewScreen1, buildInterviewSubmitModal } = require('../views/interviewForm');
const { updateReq, getReq } = require('../services/persistence');
const { generateInterviewGuide } = require('../services/openai');
const { dmCoordinator, dmCoordinatorError, routeToRecruiter } = require('../services/notifications');
const { openAshbyReq, publishToWebsite } = require('../services/ashby');
const { textToDocxBuffer } = require('../services/docx');

// Resolve a comma-separated string of Slack user IDs to display names
async function resolveNames(client, idString) {
  if (!idString) return [];
  const ids = idString.split(',').filter(Boolean);
  const names = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await client.users.info({ user: id });
        return (
          res.user?.profile?.display_name_normalized ||
          res.user?.profile?.display_name ||
          res.user?.real_name ||
          id
        );
      } catch {
        return id;
      }
    })
  );
  return names;
}

// Extract screen 1 values from view.state.values
function extractScreen1(stateValues) {
  const v = stateValues;
  return {
    phone_screeners: (v.phone_screeners?.value?.selected_users || []).join(','),
    panel_1_title: v.panel_1_title?.value?.value || '',
    panel_1_interviewers: (v.panel_1_interviewers?.value?.selected_users || []).join(','),
    panel_2_title: v.panel_2_title?.value?.value || '',
    panel_2_interviewers: (v.panel_2_interviewers?.value?.selected_users || []).join(','),
    panel_3_title: v.panel_3_title?.value?.value || '',
    panel_3_interviewers: (v.panel_3_interviewers?.value?.selected_users || []).join(','),
  };
}

// Build panels array with resolved names for the AI
async function buildPanelsForAI(client, screen1) {
  const phoneScreeners = await resolveNames(client, screen1.phone_screeners);
  const panels = await Promise.all(
    [
      { title: screen1.panel_1_title, idString: screen1.panel_1_interviewers },
      { title: screen1.panel_2_title, idString: screen1.panel_2_interviewers },
      { title: screen1.panel_3_title, idString: screen1.panel_3_interviewers },
    ]
      .filter((p) => p.title)
      .map(async (p) => ({
        title: p.title,
        interviewers: await resolveNames(client, p.idString),
      }))
  );
  return { phoneScreeners, panels };
}

// Open (or find) the DM channel with a user — files.uploadV2 needs a D... channel ID
async function getDmChannelId(client, userId) {
  const result = await client.conversations.open({ users: userId });
  return result.channel.id;
}

// Post full guide as readable DM + action buttons + DOCX upload
async function postGuideToDM(client, userId, req, guide) {
  const dmChannelId = await getDmChannelId(client, userId);

  await client.chat.postMessage({
    channel: dmChannelId,
    text: `📋 *Interview Guide: ${req.role_title}*\n\n${guide}`,
  });

  await client.chat.postMessage({
    channel: dmChannelId,
    text: 'Review the guide above, then:',
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: 'Happy with the guide? Submit the plan, or regenerate if you want a new version.' },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Submit Interview Plan' },
            action_id: 'open_interview_submit_modal',
            style: 'primary',
            value: JSON.stringify({ req_id: req.req_id }),
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '🔄 Regenerate Guide' },
            action_id: 'regenerate_guide',
            value: JSON.stringify({ req_id: req.req_id }),
          },
        ],
      },
    ],
  });

  // DOCX upload (non-fatal, fire and forget)
  textToDocxBuffer(guide).then((buf) =>
    client.files.uploadV2({
      channel_id: dmChannelId,
      filename: `interview-guide-${(req.role_title || 'role').replace(/\s+/g, '-').toLowerCase()}.docx`,
      file: buf,
      initial_comment: '⬇️ Download as .docx',
    })
  ).catch((err) => console.error('[guide] docx upload failed:', err.message));
}

function register(app) {
  // ── Screen 1 submitted: clear modal, generate guide, DM to requester ─────
  app.view('interview_screen_1', async ({ ack, body, view, client }) => {
    const { req_id } = JSON.parse(view.private_metadata);
    const screen1 = extractScreen1(view.state.values);
    const userId = body.user.id;

    // Clear the modal immediately so user can see DMs
    await ack({ response_action: 'clear' });

    // Save panel structure to DynamoDB right away
    await updateReq(req_id, {
      phone_screeners: screen1.phone_screeners,
      panel_1_title: screen1.panel_1_title,
      panel_1_interviewers: screen1.panel_1_interviewers,
      panel_2_title: screen1.panel_2_title,
      panel_2_interviewers: screen1.panel_2_interviewers,
      panel_3_title: screen1.panel_3_title,
      panel_3_interviewers: screen1.panel_3_interviewers,
    }).catch(() => {});

    // Tell user we're on it
    await client.chat.postMessage({
      channel: userId,
      text: '🧚 Generating your interview guide... hang tight!',
    }).catch(() => {});

    try {
      const req = await getReq(req_id);
      const { phoneScreeners, panels } = await buildPanelsForAI(client, screen1);

      const guide = await generateInterviewGuide({
        roleTitle: req.role_title,
        department: req.department,
        level: req.level ? req.level.split(',') : [],
        phoneScreeners,
        panels,
      });

      await updateReq(req_id, { interview_guide: guide });
      await postGuideToDM(client, userId, req, guide);
    } catch (err) {
      console.error('interview guide generation error:', err);
      await client.chat.postMessage({
        channel: userId,
        text: `⚠️ Failed to generate interview guide: ${err.message}`,
      }).catch(() => {});
      // Still show submit button so they can proceed
      const req = await getReq(req_id).catch(() => ({ req_id }));
      await client.chat.postMessage({
        channel: userId,
        text: 'You can still submit the plan or try regenerating:',
        blocks: [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '✅ Submit Interview Plan' },
                action_id: 'open_interview_submit_modal',
                style: 'primary',
                value: JSON.stringify({ req_id }),
              },
              {
                type: 'button',
                text: { type: 'plain_text', text: '🔄 Try Regenerating' },
                action_id: 'regenerate_guide',
                value: JSON.stringify({ req_id }),
              },
            ],
          },
        ],
      }).catch(() => {});
    }
  });

  // ── Regenerate guide (DM button) ─────────────────────────────────────────
  app.action('regenerate_guide', async ({ ack, body, client }) => {
    await ack();
    const { req_id } = JSON.parse(body.actions[0].value);
    const userId = body.user.id;

    await client.chat.postMessage({
      channel: userId,
      text: '🧚 Regenerating your interview guide...',
    }).catch(() => {});

    try {
      const req = await getReq(req_id);
      const { phoneScreeners, panels } = await buildPanelsForAI(client, {
        phone_screeners: req.phone_screeners || '',
        panel_1_title: req.panel_1_title || '',
        panel_1_interviewers: req.panel_1_interviewers || '',
        panel_2_title: req.panel_2_title || '',
        panel_2_interviewers: req.panel_2_interviewers || '',
        panel_3_title: req.panel_3_title || '',
        panel_3_interviewers: req.panel_3_interviewers || '',
      });

      const guide = await generateInterviewGuide({
        roleTitle: req.role_title,
        department: req.department,
        level: req.level ? req.level.split(',') : [],
        phoneScreeners,
        panels,
      });

      await updateReq(req_id, { interview_guide: guide });
      await postGuideToDM(client, userId, req, guide);
    } catch (err) {
      console.error('regenerate_guide error:', err);
      await client.chat.postMessage({
        channel: userId,
        text: `⚠️ Regeneration failed: ${err.message}`,
      }).catch(() => {});
    }
  });

  // ── Open submit modal (from DM button) ───────────────────────────────────
  app.action('open_interview_submit_modal', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id } = JSON.parse(body.actions[0].value);
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildInterviewSubmitModal({ req_id }),
      });
    } catch (err) {
      console.error('open_interview_submit_modal error:', err);
    }
  });

  // ── Interview plan submitted ─────────────────────────────────────────────
  app.view('interview_plan_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const { req_id } = JSON.parse(view.private_metadata);
      const notes = view.state.values.notes?.value?.value || '';
      const userId = body.user.id;

      if (notes) {
        await updateReq(req_id, { interview_notes: notes });
      }

      const req = await getReq(req_id);

      // 1. DM talent coordinator with summary
      await dmCoordinator(
        client,
        `🧚 *New Approved Req Ready for Launch — ${req.role_title}* (\`${req_id}\`)\n\n` +
          `*Department:* ${req.department} | *Level:* ${req.level} | *Headcount:* ${req.headcount}\n` +
          `*Salary Range:* ${req.salary_range} | *Location:* ${req.location}\n` +
          `*Hiring Manager:* <@${req.hiring_manager_slack_id}>\n` +
          `*Requested by:* <@${req.requester_slack_id}>\n\n` +
          `*Job Description:*\n${req.job_description || '_None_'}` +
          (notes ? `\n\n*Requester Notes:*\n${notes}` : '')
      );

      // Upload guide to coordinator as DOCX
      if (req.interview_guide) {
        getDmChannelId(client, process.env.SLACK_USER_TALENT_COORDINATOR)
          .then((dmId) => textToDocxBuffer(req.interview_guide).then((buf) =>
            client.files.uploadV2({
              channel_id: dmId,
              filename: `interview-guide-${req_id}.docx`,
              file: buf,
              initial_comment: `📋 Interview guide for *${req.role_title}*`,
            })
          ))
          .catch((err) => console.error('[coordinator] guide upload failed:', err.message));
      }

      // 2. Route to recruiter
      await routeToRecruiter(client, req);

      // 3. Open Ashby req (non-fatal)
      try {
        const jobId = await openAshbyReq(req, client);
        await publishToWebsite(jobId);
        await updateReq(req_id, { ashby_job_id: jobId });
        console.log(`[ashby] opened job ${jobId} for req ${req_id}`);
      } catch (ashbyErr) {
        console.error('[ashby] error (non-fatal):', ashbyErr.message, JSON.stringify(ashbyErr.response?.data));
        await dmCoordinatorError(client, ashbyErr, req).catch(() => {});
      }

      // 4. Confirm to requester
      await client.chat.postMessage({
        channel: userId,
        text: `🚀 Interview plan submitted! The role is being opened in Ashby and your recruiter has been notified.`,
      });
    } catch (err) {
      console.error('interview_plan_submit error:', err);
      try {
        const { req_id } = JSON.parse(view.private_metadata);
        const req = await getReq(req_id).catch(() => ({ req_id }));
        await dmCoordinatorError(client, err, req);
      } catch (_) {}
    }
  });
}

module.exports = { register };
