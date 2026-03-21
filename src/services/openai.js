const OpenAI = require('openai');

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateJobDescription({ roleTitle, department, level, hiringManager }) {
  const client = getClient();
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

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1200,
  });

  return response.choices[0].message.content;
}

async function generateInterviewGuide({ roleTitle, department, level, panels }) {
  const client = getClient();
  const levels = Array.isArray(level) ? level.join(', ') : level;
  const panelDetails = (panels || [])
    .filter((p) => p && p.title)
    .map((p, i) => `Panel ${i + 1}: ${p.title}`)
    .join('\n');

  const prompt = `You are an expert talent acquisition specialist. Create a comprehensive structured interview guide for the following role.

Role: ${roleTitle || 'Not specified'}
Department: ${department || 'Not specified'}
Level: ${levels || 'Not specified'}
Interview Panels:
${panelDetails || 'No panels specified'}

Create an interview guide with these exact sections:
## Phone Screen
## Technical/Skills Assessment
## Culture & Values
## Leadership & Collaboration

For each section provide:
- 4–6 behavioral interview questions specific to the role and level
- What signals to look for in strong candidate responses
- Red flags to watch for

Make questions practical, insightful, and specific to the role. Avoid generic questions.`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2500,
  });

  return response.choices[0].message.content;
}

module.exports = { generateJobDescription, generateInterviewGuide };
