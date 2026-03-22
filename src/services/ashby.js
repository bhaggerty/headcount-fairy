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
    (l) => !l.isArchived && l.name.toLowerCase() === locationName.toLowerCase()
  );
  if (match) return match.id;

  console.log(`[ashby] location "${locationName}" not found, creating it`);
  const { data: created } = await ax.post('/location.create', { name: locationName });
  if (!created.success) {
    console.warn(`[ashby] location.create failed:`, JSON.stringify(created));
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

// Creates a job in Ashby and returns the job ID
async function openAshbyReq(req) {
  const ax = getClient();

  const [locationId, departmentId] = await Promise.all([
    lookupLocationId(ax, req.location || ''),
    lookupDepartmentId(ax, req.department || ''),
  ]);

  const payload = {
    title: req.role_title,
    ...(departmentId && { departmentId }),
    ...(locationId && { locationId }),
  };

  console.log('[ashby] job.create request:', JSON.stringify(payload));
  const { data } = await ax.post('/job.create', payload);
  console.log('[ashby] job.create response:', JSON.stringify(data));
  if (!data.success) throw new Error(`job.create failed: ${JSON.stringify(data)}`);
  return data.results.id;
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
