const { buildReqForm } = require('../views/reqForm');

function register(app) {
  app.command('/headcount-fairy', async ({ ack, body, client }) => {
    await ack();
    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildReqForm(),
      });
    } catch (err) {
      console.error('Failed to open headcount fairy modal:', err);
    }
  });
}

module.exports = { register };
