const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

const MODEL_ID = 'us.anthropic.claude-3-5-haiku-20241022-v1:0';

function getClient() {
  return new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-west-2' });
}

async function callClaude(prompt, maxTokens) {
  const client = getClient();
  const response = await client.send(new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens },
  }));
  return response.output.message.content[0].text;
}

async function generateJobDescription({ roleTitle, department, level }) {
  const levels = Array.isArray(level) ? level.join(', ') : level;
  const prompt = `You are writing a job description for ConductorOne. Match the company's voice and format exactly as shown in the example below.

ROLE TO WRITE: ${roleTitle || 'Not specified'}
Department: ${department || 'Not specified'}
Level: ${levels || 'Not specified'}

FORMAT TO FOLLOW (use this exact structure):

---
ConductorOne is the first AI-native identity security platform that protects every identity: human, non-human, and AI. With powerful automation, platform-level AI, and out-of-the-box connectors, it centralizes access visibility, enforces fine-grained controls, enables just-in-time access, and automates user access reviews across all apps. It's easy to use, quick to deploy, and trusted by enterprises like DigitalOcean, Instacart, Ramp, and Zscaler.

[2–3 sentences specific to this role: what the person will build/own, who they'll work with, what impact they'll have. Use "you'll" not "the candidate will". Be specific to the role.]

What you'll do:
- [responsibility]
- [responsibility]
- [5–8 bullets total, specific to this role]

You would be an excellent candidate if…
- [qualification]
- [qualification]
- [5–8 bullets total]
- You embody ConductorOne's values: Earn the Customer's Trust, Embrace Change, Practice Compassionate Candor, and Be the Conductor.

Extra Credit if…
- [nice-to-have]
- [3–5 bullets total]

ConductorOne, Inc. is an Equal Employment Opportunity Employer. All qualified applicants will receive consideration for employment without regard to race, color, creed, religion, sex, sexual orientation, national origin or nationality, ancestry, age, disability, gender identity or expression, marital status, veteran status or any other category protected by law.
---

TONE GUIDELINES:
- Confident and direct but warm — write "you'll" not "the successful candidate will"
- Product-minded language, avoid generic corporate buzzwords
- Be specific about the actual work, not vague platitudes
- Match the energy of a fast-moving, high-growth startup`;

  return callClaude(prompt, 1200);
}

async function generateInterviewGuide({ roleTitle, department, level, phoneScreeners, panels }) {
  const levels = Array.isArray(level) ? level.join(', ') : level;

  const panelDetails = (panels || [])
    .filter((p) => p && p.title)
    .map((p, i) => `Panel ${i + 1}: "${p.title}" — Interviewers: ${(p.interviewers || []).join(', ') || 'TBD'}`)
    .join('\n');

  const prompt = `You are writing a structured interview guide for ConductorOne, an AI-native identity security platform.

ROLE: ${roleTitle || 'Not specified'}
DEPARTMENT: ${department || 'Not specified'}
LEVEL: ${levels || 'Not specified'}
PHONE SCREENERS: ${(phoneScreeners || []).join(', ') || 'TBD'}
PANELS:
${panelDetails || 'No panels specified'}

Generate a complete interview guide following this EXACT format and structure. Be specific to the role — do not use generic questions.

---
ONSITE INTERVIEW PLAN — ${(roleTitle || 'Role').toUpperCase()}

OBJECTIVES GUIDE
The interviewers are tasked with giving the candidate an opportunity to give specific evidence and examples of the skills listed below. Tiers are as follows:
  Tier 1 — All qualified candidates should have examples for these. Cover the majority before moving to Tier 2 & 3.
  Tier 2 — Qualified candidates may or may not have these depending on experience level.
  Tier 3 — Not required; highlights a highly exceptional candidate.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHONE SCREEN
Interviewers: ${(phoneScreeners || []).join(', ') || 'TBD'}
Duration: 30 minutes
Objective: Assess baseline qualifications, communication, and motivation for joining ConductorOne.

Scorecard — There is evidence that the candidate…
  Tier 1 | [4–5 baseline qualification checks specific to this role]
  Tier 2 | [2–3 stronger signals]

Suggested Questions:
  1. [opening question]
  2. [motivation/background question]
  3. [role-specific question]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[For each panel provided, generate a full section in this format:]

[PANEL TITLE IN CAPS]
Interviewers: [from panel]
Duration: 60 minutes
Objective: [1–2 sentences on what this panel should evaluate, specific to the panel title and role]

Scorecard — There is evidence that the candidate…
  Tier 1 | [5–7 evidence items specific to this panel focus and role — these are observable skills, not questions]
  Tier 2 | [3–4 evidence items]
  Tier 3 | [1–2 exceptional signals]

Suggested Questions:
  1. [behavioral question with 3–4 follow-up prompts labeled a, b, c, d]
  2. [behavioral question with follow-ups]
  3. [situational question]
  4. [role/panel-specific question]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Repeat for all panels]

---

TONE: Professional but direct. Questions should be behavioral ("Tell me about a time...") and situational. Scorecard items should be observable evidence statements ("Can give an example of...", "Demonstrates..."). Tailor everything tightly to the role.`;

  return callClaude(prompt, 3000);
}

module.exports = { generateJobDescription, generateInterviewGuide };
