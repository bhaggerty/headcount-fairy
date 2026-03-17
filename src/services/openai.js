const OpenAI = require('openai');

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function generateJobDescription({ roleTitle, department, level, hiringManager }) {
  const client = getClient();
  const levels = Array.isArray(level) ? level.join(', ') : level;
  const prompt = `You are an expert technical recruiter. Write a compelling, inclusive job description for the following role.

Role: ${roleTitle || 'Not specified'}
Department: ${department || 'Not specified'}
Level: ${levels || 'Not specified'}
Hiring Manager: ${hiringManager || 'Not specified'}

Format the job description with these exact sections:
## About the Role
## What You'll Do
## What We're Looking For
## Bonus Points

Keep it warm, engaging, and specific. Avoid buzzwords and generic phrases. Aim for 400–600 words total.`;

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
