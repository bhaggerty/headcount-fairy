const { buildInterviewScreen2 } = require('../views/interviewForm');
const { updateReq, getReq } = require('../services/sheets');
const { generateInterviewGuide } = require('../services/openai');
const { dmJenni, dmJenniError, routeToRecruiter } = require('../services/notifications');
const { openAshbyReq, publishToWebsite } = require('../services/ashby');

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

function buildPanelsForAI(screen1) {
  return [
    { title: screen1.panel_1_title },
    { title: screen1.panel_2_title },
    { title: screen1.panel_3_title },
  ].filter((p) => p.title);
}

function register(app) {
  // ── Screen 1 → Screen 2: generate guide and push new view ───────────────
  app.action('interview_next_screen', async ({ ack, body, client }) => {
    await ack();
    try {
      const { req_id } = JSON.parse(body.view.private_metadata);
      const screen1 = extractScreen1(body.view.state.values);
      const req = await getReq(req_id);

      const guide = await generateInterviewGuide({
        roleTitle: req.role_title,
        department: req.department,
        level: req.level ? req.level.split(',') : [],
        panels: buildPanelsForAI(screen1),
      });

      const metadata = { req_id, ...screen1 };

      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildInterviewScreen2({ metadata, guide }),
      });
    } catch (err) {
      console.error('interview_next_screen error:', err);
      // Show error in a new view push if possible
      try {
        const { req_id } = JSON.parse(body.view.private_metadata);
        const screen1 = extractScreen1(body.view.state.values);
        const metadata = { req_id, ...screen1 };
        await client.views.push({
          trigger_id: body.trigger_id,
          view: buildInterviewScreen2({
            metadata,
            guide: '',
            error: `Failed to generate guide: ${err.message}. You can write it manually.`,
          }),
        });
      } catch (_) {
        // swallow if push also fails
      }
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

      const guide = await generateInterviewGuide({
        roleTitle: req.role_title,
        department: req.department,
        level: req.level ? req.level.split(',') : [],
        panels: buildPanelsForAI(metadata),
      });

      await client.views.update({
        view_id: viewId,
        view: buildInterviewScreen2({ metadata, guide }),
      });
    } catch (err) {
      console.error('regenerate_guide error:', err);
      await client.views.update({
        view_id: viewId,
        view: buildInterviewScreen2({
          metadata: metaStr,
          guide: body.view.state.values?.interview_guide?.value?.value || '',
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
      const interviewGuide = view.state.values.interview_guide.value.value;
      const userId = body.user.id;

      // Persist all interview data to sheet
      await updateReq(req_id, {
        phone_screeners: metadata.phone_screeners || '',
        panel_1_title: metadata.panel_1_title || '',
        panel_1_interviewers: metadata.panel_1_interviewers || '',
        panel_2_title: metadata.panel_2_title || '',
        panel_2_interviewers: metadata.panel_2_interviewers || '',
        panel_3_title: metadata.panel_3_title || '',
        panel_3_interviewers: metadata.panel_3_interviewers || '',
        interview_guide: interviewGuide,
      });

      const req = await getReq(req_id);

      // ── Post-approval fanout ─────────────────────────────────────────────

      // 1. DM Jenni with full summary
      await dmJenni(
        client,
        `🧚 *New Approved Req Ready for Launch — ${req.role_title}* (\`${req_id}\`)\n\n` +
          `*Department:* ${req.department} | *Level:* ${req.level} | *Headcount:* ${req.headcount}\n` +
          `*Salary Range:* ${req.salary_range} | *Location:* ${req.location}\n` +
          `*Hiring Manager:* <@${req.hiring_manager_slack_id}>\n` +
          `*Requested by:* <@${req.requester_slack_id}>\n\n` +
          `*Job Description:*\n${req.job_description || '_None_'}\n\n` +
          `*Interview Guide:*\n${interviewGuide}`
      );

      // 2. Route to recruiter
      await routeToRecruiter(client, { ...req, interview_guide: interviewGuide });

      // 3. Open Ashby req and publish (failure does NOT block rest of flow)
      try {
        const jobId = await openAshbyReq(req);
        await publishToWebsite(jobId);
        await updateReq(req_id, { ashby_job_id: jobId });
      } catch (ashbyErr) {
        console.error('Ashby error (non-fatal):', ashbyErr);
        await dmJenniError(client, ashbyErr, req).catch(() => {});
      }

      // 4. Confirm to requester
      await client.chat.postMessage({
        channel: userId,
        text: `🚀 Interview plan submitted! The role is now being opened in Ashby and your recruiter has been notified.`,
      });
    } catch (err) {
      console.error('interview_plan_submit error:', err);
      try {
        const { req_id } = JSON.parse(view.private_metadata);
        const req = await getReq(req_id).catch(() => ({ req_id }));
        await dmJenniError(client, err, req);
      } catch (_) {}
    }
  });
}

module.exports = { register };
