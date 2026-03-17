# 🧚 Headcount Fairy

A Slack bot that manages the full headcount request lifecycle — from submission through dual approval, interview planning, recruiter routing, and Ashby job creation.

## How It Works

1. **Submit** — anyone runs `/headcount-fairy` in Slack to open the request form. Optionally generate a job description with AI.
2. **Alex reviews** — approves, approves with guidance, returns with questions, or denies.
3. **Josh reviews** — approves or rejects.
4. **Interview plan** — requester builds their panel and gets an AI-generated interview guide.
5. **Fanout** — Jenni is notified, the req is routed to the right recruiter, and the job is opened and published in Ashby.

All requests are logged to a Google Sheet for tracking and downstream system use.

## File Structure

```
index.js                        — App entry point, wires all handlers
src/
├── handlers/
│   ├── command.js              — /headcount-fairy slash command
│   ├── reqSubmit.js            — Form submission + AI JD generation
│   ├── approvalActions.js      — Alex & Josh approval flows
│   └── interviewSubmit.js      — Interview plan + post-approval fanout
├── views/
│   ├── reqForm.js              — Requisition modal
│   ├── interviewForm.js        — Interview plan screens 1 & 2
│   └── approvalMsgs.js         — DM blocks and approval modals
└── services/
    ├── sheets.js               — Google Sheets read/write
    ├── openai.js               — GPT-4o JD and interview guide generation
    ├── ashby.js                — Ashby job creation and publishing
    └── notifications.js        — Slack DMs to Jenni and recruiters
```

## Approval Flow

```
Requester → /headcount-fairy → Alex → Josh → Requester (build interview plan) → Launch
```

**Alex's options:** Approve · Approve with Guidance · Return with Questions · Deny
**Josh's options:** Approve · Reject

## Recruiter Routing

| Department | Recruiter |
|---|---|
| Engineering, Product, Design | Steven Craig |
| Sales, Marketing, Customer Success | Ali Camilli |
| Everything else | Blake Haggerty |

## Google Sheet

Tab: `Sheet1` — one row per req, headers on row 3.

| Col | Field |
|-----|-------|
| B | REQ-ID |
| C | Department |
| D | Title |
| E | Hiring Manager |
| F | Level |
| G | JD Description |
| H | Status |
| I–AB | Full req data (approval notes, interview plan, Ashby ID, etc.) |

## Required Secrets

Managed via Union Station.

```
SLACK_BOT_TOKEN
SLACK_SIGNING_SECRET
SLACK_USER_ALEX_BOVEE
SLACK_USER_JOSH_WEISS
SLACK_USER_JENNI_CAPURRO
SLACK_USER_ALI_CAMILLI
SLACK_USER_STEVEN_CRAIG
SLACK_USER_BLAKE_HAGGERTY
OPENAI_API_KEY
ASHBY_API_KEY
GOOGLE_SHEETS_ID
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
PORT
```

## Running Locally

```bash
npm install
node index.js
# 🧚 Headcount Fairy is granting wishes on port 8080
```
