const { buildReqForm } = require('../views/reqForm');
const { alexDM } = require('../views/approvalMsgs');
const { writeReq } = require('../services/persistence');
const { generateJobDescription } = require('../services/openai');

function register(app) {
  // ── Generate JD with AI ──────────────────────────────────────────────────
  app.action('generate_jd_ai', async ({ ack, body, client }) => {
    await ack();
    const viewId = body.view.id;
    const v = body.view.state.values;

    try {
      const roleTitle = v.role_title?.value?.value || '';
      const department = v.department?.value?.selected_option?.value || '';
      const level = (v.level?.value?.selected_options || []).map((o) => o.value);

      // Show loading state immediately
      await client.views.update({ view_id: viewId, view: buildReqForm({ loading: true }) }).catch(() => {});

      const jd = await generateJobDescription({ roleTitle, department, level });

      // Try to pre-fill the modal; if the view is gone, DM the JD instead
      await client.views.update({ view_id: viewId, view: buildReqForm({ jd }) })
        .catch(() =>
          client.chat.postMessage({
            channel: body.user.id,
            text: `📝 *AI-Generated Job Description for ${roleTitle}:*\n\n${jd}\n\n_Copy this into the form._`,
          })
        );
    } catch (err) {
      console.error('AI JD generation failed:', err);
      await client.views.update({
        view_id: viewId,
        view: buildReqForm({ error: `AI generation failed: ${err.message}. You can still write the description manually.` }),
      }).catch(() => {});
    }
  });

  // ── Req form submitted ───────────────────────────────────────────────────
  app.view('req_form_submit', async ({ ack, body, view, client }) => {
    await ack();
    try {
      const v = view.state.values;
      const userId = body.user.id;

      const level = (v.level.value.selected_options || []).map((o) => o.value).join(',');
      const location = (v.location.value.selected_options || []).map((o) => o.value).join(',');
      const hiring_manager_slack_id = v.hiring_manager.value.selected_user;

      // Resolve display name for the sheet's Hiring Manager column
      const hmInfo = await client.users.info({ user: hiring_manager_slack_id });
      const hiring_manager_name =
        hmInfo.user?.profile?.display_name_normalized ||
        hmInfo.user?.profile?.display_name ||
        hmInfo.user?.real_name ||
        hiring_manager_slack_id;

      const req = {
        req_id: `REQ-${Date.now()}`,
        status: 'pending_alex',
        requester_slack_id: userId,
        role_title: v.role_title.value.value,
        headcount: v.headcount.value.value,
        hiring_manager_slack_id,
        hiring_manager_name,
        department: v.department.value.selected_option.value,
        level,
        salary_range: v.salary_range.value.value,
        job_description: v.job_description?.value?.value || '',
        alex_decision: '',
        alex_notes: '',
        josh_decision: '',
        josh_notes: '',
        phone_screeners: '',
        panel_1_title: '',
        panel_1_interviewers: '',
        panel_2_title: '',
        panel_2_interviewers: '',
        panel_3_title: '',
        panel_3_interviewers: '',
        interview_guide: '',
        location,
        ashby_job_id: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await writeReq(req);

      await client.chat.postMessage({
        channel: process.env.SLACK_USER_HIRING_LEAD,
        ...alexDM(req),
      });

      await client.chat.postMessage({
        channel: userId,
        text:
          `✨ *Your wish has been submitted!*\n` +
          `Req ID: \`${req.req_id}\`\n\n` +
          `Your request is now under review. I'll send you an update as soon as there's news! 🧚`,
      });
    } catch (err) {
      console.error('Error in req_form_submit:', err);
      await client.chat.postMessage({
        channel: process.env.SLACK_USER_TALENT_COORDINATOR,
        text:
          `⚠️ *Error processing req submission*\n${err.message}\n\n` +
          `User: <@${body.user.id}>\nForm data:\n\`\`\`${JSON.stringify(view.state.values, null, 2)}\`\`\``,
      }).catch(() => {});
    }
  });
}

module.exports = { register };
