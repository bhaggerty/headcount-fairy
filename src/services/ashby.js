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

// Creates a job in Ashby and returns the job ID
async function openAshbyReq(req) {
  const ax = getClient();
  const payload = { title: req.role_title };
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
