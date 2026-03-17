const axios = require('axios');

const BASE_URL = 'https://api.ashbyhq.com';

function getClient() {
  return axios.create({
    baseURL: BASE_URL,
    auth: {
      username: process.env.ASHBY_API_KEY,
      password: '',
    },
  });
}

async function openAshbyReq(req) {
  const ax = getClient();
  const { data } = await ax.post('/jobs', {
    title: req.role_title,
    jobPostingTitle: req.role_title,
    employmentType: 'FullTime',
  });
  return data.id || data.job?.id;
}

async function publishToWebsite(jobId) {
  const ax = getClient();
  await ax.post(`/jobs/${jobId}/publish`);
}

module.exports = { openAshbyReq, publishToWebsite };
