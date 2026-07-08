require('dotenv').config();
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

require('./src/handlers/command').register(app);
require('./src/handlers/reqSubmit').register(app);
require('./src/handlers/approvalActions').register(app);
require('./src/handlers/interviewSubmit').register(app);

(async () => {
  await app.start(process.env.PORT || 8080);
  console.log('🧚 Headcount Fairy is granting wishes on port 8080');
})();
