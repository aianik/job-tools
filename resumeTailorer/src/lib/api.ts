import type { ResumeData, PersonaData } from '../types'

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `You are a professional resume adapter. Given a resume (LaTeX source or plain text) and a job description, you tailor the resume to the job.

Return a JSON object with exactly this shape:
{
  "companyName": string,  // the hiring company's name, extracted from the job description
  "header": { "name": string, "email": string, "phone": string, "location": string, "linkedin"?: string, "github"?: string, "website"?: string },
  "summary"?: string,
  "sections": [
    // one of:
    { "type": "experience", "id": string, "title": string, "items": [{ "id": string, "company": string, "role": string, "location": string, "dates": string, "bullets": string[] }] }
    { "type": "education", "id": string, "title": string, "items": [{ "id": string, "institution": string, "degree": string, "location": string, "dates": string, "notes"?: string[] }] }
    { "type": "skills", "id": string, "title": string, "categories": [{ "id": string, "label": string, "items": string[] }] }
    { "type": "projects", "id": string, "title": string, "items": [{ "id": string, "name": string, "tech"?: string, "dates"?: string, "bullets": string[] }] }
    { "type": "publications", "id": string, "title": string, "items": [{ "id": string, "citation": string }] }
    { "type": "custom", "id": string, "title": string, "content": string }
  ],
  "rawTex": string  // full adapted LaTeX source using Jake's resume template
}

Rules:
- Preserve all factual information. Do NOT invent experience, skills, or credentials.
- Reorder and reframe bullet points to emphasize relevance to the job description.
- Use strong action verbs and quantify achievements where the source already has numbers.
- Keep bullet points concise (one line each where possible).
- Use unique short IDs (e.g. "exp-1", "edu-1", "sk-1") for all id fields.
- ALL string values in the JSON must be plain text only. Never put LaTeX commands, backslashes, or any markup inside JSON string values (bullets, content, labels, etc.). The "rawTex" field is the only exception.
- For "custom" sections (e.g. service, awards, activities), extract the plain-text content from LaTeX and put each item as a separate plain-text line — do NOT copy raw LaTeX into the content string.
- For rawTex, use Jake's resume template (\\documentclass[letterpaper,11pt]{article} with geometry, titlesec, enumitem, hyperref, fontawesome5).
- CRITICAL for header extraction: scan the ENTIRE resume source for contact details. LinkedIn URLs appear as "linkedin.com/in/...", "www.linkedin.com/in/...", or full "https://linkedin.com/in/..." — always extract the full URL into the "linkedin" field. Do the same for GitHub ("github.com/...") and personal websites. Never leave these blank if they appear anywhere in the source.
- Return ONLY the JSON object, no markdown fences, no explanation.`

export async function adaptResume(
  resumeSource: string,
  jobDescription: string,
  apiKey: string,
  persona: PersonaData | null
): Promise<ResumeData> {
  const hasPersona = persona && (persona.targetRole || persona.tone || persona.strengths || persona.avoid || persona.headerInstructions)
  const personaBlock = hasPersona
    ? `\n\nPersona guidance:\n- Target role: ${persona!.targetRole || 'not specified'}\n- Tone: ${persona!.tone || 'professional'}\n- Key strengths to emphasize: ${persona!.strengths || 'none specified'}\n- Avoid: ${persona!.avoid || 'none specified'}${persona!.headerInstructions ? `\n- Header instructions: ${persona!.headerInstructions}` : ''}`
    : ''

  const userMessage = `RESUME SOURCE:\n${resumeSource}\n\nJOB DESCRIPTION:\n${jobDescription}${personaBlock}`

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`)
  }

  const data = await res.json() as { content: { type: string; text: string }[] }
  const text = data.content.find(b => b.type === 'text')?.text ?? ''

  // Claude sometimes wraps the response in ```json ... ``` despite instructions
  const stripped = text
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/```\s*$/m, '')
    .trim()

  // If still not a JSON object, try to extract the first {...} block
  const jsonText = stripped.startsWith('{')
    ? stripped
    : (stripped.match(/\{[\s\S]*\}/) ?? [''])[0]

  let parsed: ResumeData
  try {
    parsed = JSON.parse(jsonText) as ResumeData
  } catch {
    throw new Error('Claude returned invalid JSON. Please try again.')
  }

  return parsed
}
