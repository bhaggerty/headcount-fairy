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

// Transitions the job from Draft → Open (publishes it)
async function publishToWebsite(jobId) {
  const ax = getClient();
  await ax.post('/job.setStatus', {
    jobId,
    status: 'Open',
  });
}

module.exports = { openAshbyReq, publishToWebsite };
