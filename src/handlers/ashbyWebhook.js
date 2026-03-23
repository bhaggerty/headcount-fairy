const axios = require('axios');

const ONBOARDING_SLACK_USER = 'U08SMNZA272';

// Known Ashby statuses that indicate a fully executed (all parties signed) offer
const FULLY_EXECUTED_STATUSES = ['completed', 'fully_executed', 'signed', 'complete', 'executed'];

function getAshbyClient() {
  return axios.create({
    baseURL: 'https://api.ashbyhq.com',
    auth: { username: process.env.ASHBY_API_KEY, password: '' },
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatOfferForSlack(offer) {
  const v = offer.latestVersion || offer;
  const lines = [];

  if (offer.candidate?.name) lines.push(`*Candidate:* ${offer.candidate.name}`);
  if (offer.candidate?.primaryEmailAddress?.value) lines.push(`*Email:* ${offer.candidate.primaryEmailAddress.value}`);
  if (offer.job?.title) lines.push(`*Role:* ${offer.job.title}`);
  if (offer.job?.departmentId) lines.push(`*Department ID:* ${offer.job.departmentId}`);
  if (v.employmentType) lines.push(`*Employment Type:* ${v.employmentType}`);
  if (v.startDate) lines.push(`*Start Date:* ${v.startDate}`);

  if (v.compensationTiers?.length) {
    const tier = v.compensationTiers[0];
    const min = tier.minValue ? `$${Number(tier.minValue).toLocaleString()}` : null;
    const max = tier.maxValue ? `$${Number(tier.maxValue).toLocaleString()}` : null;
    if (min && max) lines.push(`*Compensation:* ${min} – ${max} / ${tier.interval || '1 YEAR'}`);
    else if (min || max) lines.push(`*Compensation:* ${min || max} / ${tier.interval || '1 YEAR'}`);
  }

  if (v.hiringTeam?.length) {
    const hm = v.hiringTeam.find((m) => m.role === 'HiringManager');
    if (hm) lines.push(`*Hiring Manager:* ${hm.firstName} ${hm.lastName}`);
  }

  // Dump any custom fields
  if (v.customFields?.length) {
    v.customFields.forEach((f) => {
      if (f.value !== null && f.value !== undefined && f.value !== '') {
        lines.push(`*${f.title}:* ${f.valueLabel || f.value}`);
      }
    });
  }

  return lines.join('\n');
}

function register(app) {
  app.receiver.router.post('/webhooks/ashby', async (req, res) => {
    // Verify secret — Ashby sends it as a top-level field in the body
    const secret = req.body?.secretToken || req.headers['x-ashby-token'];
    if (process.env.ASHBY_WEBHOOK_SECRET && secret !== process.env.ASHBY_WEBHOOK_SECRET) {
      console.warn('[ashby-webhook] unauthorized — secret mismatch');
      return res.status(401).send('Unauthorized');
    }

    res.sendStatus(200); // Acknowledge immediately before any async work

    const { eventType, data } = req.body || {};
    console.log('[ashby-webhook] received event:', eventType);

    if (eventType !== 'signatureRequestUpdate') return;

    const status = (data?.status || data?.signatureRequest?.status || '').toLowerCase();
    console.log('[ashby-webhook] signature status:', status, '| full data:', JSON.stringify(data));

    if (!FULLY_EXECUTED_STATUSES.includes(status)) {
      console.log('[ashby-webhook] not fully executed, skipping');
      return;
    }

    try {
      const ax = getAshbyClient();
      const offerId = data?.offerId || data?.offer?.id || data?.signatureRequest?.offerId;

      let offer = data?.offer || {};
      if (offerId) {
        const { data: offerData } = await ax.post('/offer.info', { offerId });
        if (offerData.success) {
          offer = offerData.results;
        } else {
          console.warn('[ashby-webhook] offer.info failed:', JSON.stringify(offerData));
        }
      }

      const candidateName = offer.candidate?.name || offer.latestVersion?.candidate?.name || 'Unknown Candidate';
      const jobTitle = offer.job?.title || 'Unknown Role';
      const summary = formatOfferForSlack(offer);

      await app.client.chat.postMessage({
        channel: ONBOARDING_SLACK_USER,
        text: `🎉 *Offer fully executed — Start Onboarding!*\n\n*${candidateName} — ${jobTitle}*\n\n${summary}`,
      });

      console.log(`[ashby-webhook] onboarding DM sent for ${candidateName}`);
    } catch (err) {
      console.error('[ashby-webhook] error sending DM:', err.message);
    }
  });
}

module.exports = { register };
