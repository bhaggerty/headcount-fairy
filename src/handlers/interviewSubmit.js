const { buildInterviewScreen2 } = require('../views/interviewForm');
const { updateReq, getReq } = require('../services/persistence');
const { generateInterviewGuide } = require('../services/openai');
const { dmCoordinator, dmCoordinatorError, routeToRecruiter } = require('../services/notifications');
const { openAshbyReq, publishToWebsite } = require('../services/ashby');

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

function register(app) {
  // ── Screen 1 → Screen 2: push immediately, generate guide async ──────────
  app.view('interview_screen_1', async ({ ack, body, view, client }) => {
    const { req_id } = JSON.parse(view.private_metadata);
    const screen1 = extractScreen1(view.state.values);
    const metadata = { req_id, ...screen1 };

    // Push screen 2 immediately — Slack requires a response within 3s
    await ack({ response_action: 'push', view: buildInterviewScreen2({ metadata }) });

    // Generate guide in the background after ack
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

      await client.chat.postMessage({
        channel: body.user.id,
        text: `📋 *Interview Guide: ${req.role_title}*\n\n${guide}`,
      });
    } catch (err) {
      console.error('interview guide generation error:', err);
      await client.chat.postMessage({
        channel: body.user.id,
        text: `⚠️ Failed to generate interview guide: ${err.message}. Use the Regenerate button in the modal.`,
      }).catch(() => {});
    }
  });

  // ── Regenerate guide ─────────────────────────────────────────────────────
  app.action('regenerate_guide', async ({ ack, body, client }) => {
    await ack();
    const viewId = body.view.id;
    const metaStr = body.view.private_metadata;

    try {
      const metadata = JSON.parse(metaStr);
      const { req_id } = metadata;
      const req = await getReq(req_id);
      const { phoneScreeners, panels } = await buildPanelsForAI(client, metadata);

      const guide = await generateInterviewGuide({
        roleTitle: req.role_title,
        department: req.department,
        level: req.level ? req.level.split(',') : [],
        phoneScreeners,
        panels,
      });

      // Update stored guide
      await updateReq(req_id, { interview_guide: guide });

      // Re-DM the new guide
      await client.chat.postMessage({
        channel: body.user.id,
        text: `📋 *Regenerated Interview Guide: ${req.role_title}*\n\n${guide}`,
      });

      await client.views.update({
        view_id: viewId,
        view: buildInterviewScreen2({ metadata }),
      });
    } catch (err) {
      console.error('regenerate_guide error:', err);
      await client.views.update({
        view_id: viewId,
        view: buildInterviewScreen2({
          metadata: metaStr,
          error: `Regeneration failed: ${err.message}`,
        }),
      });
    }
  });

  // ── Interview plan submitted ─────────────────────────────────────────────
  app.view('interview_plan_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const metadata = JSON.parse(view.private_metadata);
      const { req_id } = metadata;
      const notes = view.state.values.notes?.value?.value || '';
      const userId = body.user.id;

      // Persist panel structure and any notes
      await updateReq(req_id, {
        phone_screeners: metadata.phone_screeners || '',
        panel_1_title: metadata.panel_1_title || '',
        panel_1_interviewers: metadata.panel_1_interviewers || '',
        panel_2_title: metadata.panel_2_title || '',
        panel_2_interviewers: metadata.panel_2_interviewers || '',
        panel_3_title: metadata.panel_3_title || '',
        panel_3_interviewers: metadata.panel_3_interviewers || '',
        ...(notes && { interview_notes: notes }),
      });

      const req = await getReq(req_id);

      // ── Post-approval fanout ─────────────────────────────────────────────

      // 1. DM talent coordinator with full summary
      await dmCoordinator(
        client,
        `🧚 *New Approved Req Ready for Launch — ${req.role_title}* (\`${req_id}\`)\n\n` +
          `*Department:* ${req.department} | *Level:* ${req.level} | *Headcount:* ${req.headcount}\n` +
          `*Salary Range:* ${req.salary_range} | *Location:* ${req.location}\n` +
          `*Hiring Manager:* <@${req.hiring_manager_slack_id}>\n` +
          `*Requested by:* <@${req.requester_slack_id}>\n\n` +
          `*Job Description:*\n${req.job_description || '_None_'}\n\n` +
          `*Interview Guide:*\n${req.interview_guide || '_Not generated yet_'}` +
          (notes ? `\n\n*Requester Notes:*\n${notes}` : '')
      );

      // 2. Route to recruiter
      await routeToRecruiter(client, req);

      // 3. Open Ashby req and publish (failure does NOT block rest of flow)
      try {
        const jobId = await openAshbyReq(req);
        await publishToWebsite(jobId);
        await updateReq(req_id, { ashby_job_id: jobId });
      } catch (ashbyErr) {
        console.error('Ashby error (non-fatal):', ashbyErr);
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
