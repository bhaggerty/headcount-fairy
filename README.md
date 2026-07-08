# 🧚 Headcount Fairy

A Slack bot that manages the full headcount request lifecycle — from submission through dual approval, interview planning, recruiter routing, and Ashby job creation.

## How It Works

1. **Submit** — anyone runs `/headcount-fairy` in Slack to open the request form. Optionally generate a job description with AI.
2. **Hiring Lead reviews** — approves, approves with guidance, returns with questions, or denies.
3. **Executive Approver reviews** — approves or rejects.
4. **Interview plan** — requester builds their panel and gets an AI-generated interview guide.
5. **Fanout** — Talent Coordinator is notified, the req is routed to the right recruiter, and the job is opened and published in Ashby.

DynamoDB is the source of truth for req state. Every write is also mirrored to a Google Sheet (best-effort, non-blocking) for a human-readable view.

## File Structure

```
index.js                        — App entry point, wires all handlers
src/
├── handlers/
│   ├── command.js              — /headcount-fairy slash command
│   ├── reqSubmit.js            — Form submission + AI JD generation
│   ├── approvalActions.js      — Dual-approval flows
│   └── interviewSubmit.js      — Interview plan + post-approval fanout
├── views/
│   ├── reqForm.js              — Requisition modal
│   ├── interviewForm.js        — Interview plan screens 1 & 2
│   └── approvalMsgs.js         — DM blocks and approval modals
└── services/
    ├── dynamo.js               — DynamoDB read/write (source of truth for req state)
    ├── persistence.js          — Routes writes to DynamoDB + best-effort Sheets mirror
    ├── sheets.js               — Google Sheets writes via Apps Script webhook
    ├── openai.js               — JD and interview guide generation (Claude 3.5 Haiku via AWS Bedrock)
    ├── ashby.js                — Ashby job creation and publishing
    ├── notifications.js        — Slack DMs to Talent Coordinator and recruiters
    └── docx.js                 — Renders interview guides as downloadable .docx
```

## Approval Flow

```
Requester → /headcount-fairy → Hiring Lead → Executive Approver → Requester (build interview plan) → Launch
```

**Hiring Lead's options:** Approve · Approve with Guidance · Return with Questions · Deny
**Executive Approver's options:** Approve · Reject

## Recruiter Routing

| Department | Recruiter |
|---|---|
| Engineering, Product, Design | Tech Recruiter |
| Sales, Marketing, Customer Success | GTM Recruiter |
| Everything else | General Recruiter |

## Google Sheet

Human-facing mirror only — DynamoDB holds the full req record (approval notes, interview plan, Ashby ID, etc.). Written via the Apps Script webhook in `apps-script.js` (`APPS_SCRIPT_URL`/`APPS_SCRIPT_SECRET`).

Tab: `Sheet1` — one row per req, headers on row 3. Only these columns are ever written:

| Col | Field |
|-----|-------|
| B | REQ-ID |
| C | Department |
| D | Title |
| E | Hiring Manager |
| F | Level |
| G | JD Description |
| H | Status (updated as the req moves through approval) |

## Required Secrets

Managed via Union Station.

```
SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET
SLACK_USER_HIRING_LEAD
SLACK_USER_EXEC_APPROVER
SLACK_USER_TALENT_COORDINATOR
SLACK_USER_GTM_RECRUITER
SLACK_USER_TECH_RECRUITER
SLACK_USER_GENERAL_RECRUITER
AWS_REGION
APP_DYNAMODB_TABLE_NAME
ASHBY_API_KEY
APPS_SCRIPT_URL
APPS_SCRIPT_SECRET
PORT
```

`AWS_REGION`/`APP_DYNAMODB_TABLE_NAME` are auto-injected by Union Station in production (Bedrock for AI generation, DynamoDB for req state). Running locally also requires AWS credentials (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` or a configured profile) that can reach both services.

## Running Locally

```bash
npm install
node index.js
# 🧚 Headcount Fairy is granting wishes on port 8080
```
