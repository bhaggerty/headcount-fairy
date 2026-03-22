const axios = require('axios');

const BASE_URL = 'https://api.ashbyhq.com';

function getClient() {
  return axios.create({
    baseURL: BASE_URL,
    auth: {
      username: process.env.ASHBY_API_KEY,
      password: '',
    },
    headers: { 'Content-Type': 'application/json' },
  });
}

async function lookupLocationId(ax, locationName) {
  const { data } = await ax.post('/location.list');
  if (!data.success) return null;
  const match = data.results.find(
    (l) => !l.isArchived && l.title.toLowerCase() === locationName.toLowerCase()
  );
  if (match) return match.id;

  console.log(`[ashby] location "${locationName}" not found, creating it`);
  const { data: created } = await ax.post('/location.create', { name: locationName });
  if (!created.success) {
    console.warn('[ashby] location.create failed:', JSON.stringify(created));
    return null;
  }
  return created.results.id;
}

async function lookupDepartmentId(ax, departmentName) {
  const { data } = await ax.post('/department.list');
  if (!data.success) return null;
  const match = data.results.find(
    (d) => !d.isArchived && d.title.toLowerCase() === departmentName.toLowerCase()
  );
  if (!match) console.warn(`[ashby] no department match for "${departmentName}", available:`, data.results.map((d) => d.title));
  return match?.id || null;
}

async function lookupAshbyUserId(ax, email) {
  if (!email) return null;
  try {
    const { data } = await ax.post('/user.search', { email });
    if (!data.success || !data.results) return null;
    return data.results.id;
  } catch (err) {
    console.warn('[ashby] user.search failed:', err.message);
    return null;
  }
}

async function getHiringManagerEmail(slackClient, slackUserId) {
  if (!slackClient || !slackUserId) return null;
  try {
    const res = await slackClient.users.info({ user: slackUserId });
    return res.user?.profile?.email || null;
  } catch (err) {
    console.warn('[ashby] could not get hiring manager email from Slack:', err.message);
    return null;
  }
}

// Creates a job in Ashby with openings and returns the job ID
async function openAshbyReq(req, slackClient) {
  const ax = getClient();

  const hmEmail = await getHiringManagerEmail(slackClient, req.hiring_manager_slack_id);

  const [locationId, departmentId, hmAshbyId] = await Promise.all([
    lookupLocationId(ax, req.location || ''),
    lookupDepartmentId(ax, req.department || ''),
    lookupAshbyUserId(ax, hmEmail),
  ]);

  const payload = {
    title: req.role_title,
    ...(departmentId && { departmentId }),
    ...(locationId && { locationId }),
    ...(hmAshbyId && { hiringTeamMembers: [{ userId: hmAshbyId, role: 'HiringManager' }] }),
  };

  console.log('[ashby] job.create request:', JSON.stringify(payload));
  const { data } = await ax.post('/job.create', payload);
  console.log('[ashby] job.create response:', JSON.stringify(data));
  if (!data.success) throw new Error(`job.create failed: ${JSON.stringify(data)}`);
  const jobId = data.results.id;

  // Update job posting description (non-fatal)
  if (req.job_description) {
    await updateJobPostingDescription(ax, jobId, req.job_description)
      .catch((err) => console.warn('[ashby] jobPosting description update failed:', err.message));
  }

  // Set compensation if we have min/max
  const salaryMin = parseInt(req.salary_min, 10);
  const salaryMax = parseInt(req.salary_max, 10);
  if (salaryMin && salaryMax) {
    await ax.post('/job.updateCompensation', {
      jobId,
      compensationTiers: [{
        minValue: salaryMin,
        maxValue: salaryMax,
        currencyCode: 'USD',
        interval: '1 YEAR',
      }],
    }).catch((err) => console.warn('[ashby] job.updateCompensation failed:', err.message));
  }

  // Create one opening per headcount
  const headcount = Math.max(1, parseInt(req.headcount, 10) || 1);
  await Promise.all(
    Array.from({ length: headcount }, () =>
      ax.post('/opening.create', {
        jobIds: [jobId],
        ...(locationId && { locationIds: [locationId] }),
        ...(departmentId && { teamId: departmentId }),
      }).then(({ data: od }) => {
        if (!od.success) {
          console.warn('[ashby] opening.create failed:', JSON.stringify(od));
        } else {
          console.log('[ashby] opening created:', od.results.id);
          // Set opening state to Open
          return ax.post('/opening.setOpeningState', {
            openingId: od.results.id,
            openingState: 'Open',
          }).catch((err) => console.warn('[ashby] opening.setOpeningState failed:', err.message));
        }
      }).catch((err) => console.warn('[ashby] opening.create error:', err.message))
    )
  );

  return jobId;
}

async function updateJobPostingDescription(ax, jobId, descriptionText) {
  if (!descriptionText) return;

  // Find the job posting linked to this job
  const { data: listData } = await ax.post('/jobPosting.list');
  if (!listData.success) {
    console.warn('[ashby] jobPosting.list failed:', JSON.stringify(listData));
    return;
  }

  const posting = listData.results.find((p) => p.jobId === jobId);
  if (!posting) {
    console.warn(`[ashby] no job posting found for jobId ${jobId}`);
    return;
  }

  // Convert plain text to basic HTML
  const html = descriptionText
    .split('\n\n')
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const payload = {
    jobPostingId: posting.id,
    descriptionParts: { descriptionBody: { html } },
    suppressDescriptionOpening: true,
    suppressDescriptionClosing: true,
  };

  console.log('[ashby] jobPosting.update request:', JSON.stringify({ jobPostingId: posting.id }));
  const { data } = await ax.post('/jobPosting.update', payload);
  console.log('[ashby] jobPosting.update response:', JSON.stringify(data));
}

// Transitions the job from Draft → Open (publishes it)
async function publishToWebsite(jobId) {
  const ax = getClient();
  await ax.post('/job.setStatus', {
    jobId,
    status: 'Open',
  });
}

module.exports = { openAshbyReq, publishToWebsite };
