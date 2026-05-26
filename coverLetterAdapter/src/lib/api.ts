import type { CvFileData, PersonaData } from '../types'

const TODAY = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

function buildPersonaBlock(persona: PersonaData): string {
  const lines: string[] = []
  if (persona.target)    lines.push(`- Target roles: ${persona.target}`)
  if (persona.strengths) lines.push(`- Key strengths: ${persona.strengths}`)
  if (persona.tone)      lines.push(`- Preferred tone: ${persona.tone}`)
  if (persona.voice)     lines.push(`- Writing style/voice: ${persona.voice}`)
  if (persona.avoid)     lines.push(`- Do NOT: ${persona.avoid}`)
  if (persona.about)     lines.push(`- Additional context: ${persona.about}`)
  if (!lines.length) return ''
  return `\nApplicant profile:\n${lines.join('\n')}\n`
}

function buildSystemPrompt(baseLetter: string, signature: string, persona: PersonaData): string {
  const closingRule = signature
    ? `7. Leave a blank line before the closing. End the letter with exactly this — do not change a single word:\n\n${signature}`
    : `7. End with an appropriate professional closing.`
  const personaBlock = buildPersonaBlock(persona)
  return `You are adapting a cover letter template to a specific job posting.

Here is the applicant's base cover letter:

${baseLetter}
${personaBlock}
Rules:
1. First line of response: company name only. Next line: "---". Then the letter.
2. First line of the letter: today's date (${TODAY}). Replace any existing date in the template.
3. Fill in placeholders like [Position], [Company], or similar with exact values from the job posting.
4. Write 2–3 sentences directly connecting the applicant's background (as shown in the template) to the company's mission, product, or specific challenges.
5. Reorder or re-weight body paragraphs if a different emphasis fits the role better.
6. Keep the letter to approximately 350–420 words.
${closingRule}
8. Do NOT invent credentials, experience, or skills not present in the template.
9. Do NOT use em-dashes (—); rephrase with commas, semicolons, or separate sentences instead.
10. Return ONLY: company name, "---", and the letter. No preamble, no commentary, no markdown.`
}

function buildSystemPromptCV(signature: string, persona: PersonaData): string {
  const closingRule = signature
    ? `6. Leave a blank line before the closing. End the letter with exactly this — do not change a single word:\n\n${signature}`
    : `6. End with an appropriate professional closing.`
  const personaBlock = buildPersonaBlock(persona)
  return `You are writing a tailored cover letter from a CV/resume and a job posting.
${personaBlock}
Rules:
1. First line of response: company name only. Next line: "---". Then the letter.
2. First line of the letter: today's date (${TODAY}).
3. Write a professional, specific cover letter of 350–420 words.
4. Draw specific evidence from the CV — projects, experience, skills, tools — most relevant to this job.
5. Include 2–3 sentences connecting the applicant's background to the company's mission, product, or stated challenges.
${closingRule}
7. Do NOT invent credentials, skills, or experience not present in the CV.
8. Do NOT use em-dashes (—); rephrase with commas, semicolons, or separate sentences instead.
9. Return ONLY: company name, "---", and the letter. No preamble, no commentary, no markdown.`
}

export interface AdaptResult {
  companyName: string
  letterText: string
}

interface AdaptOptions {
  apiKey: string
  jobPosting: string
  inputTab: 'base' | 'cv'
  baseLetter: string
  signature: string
  persona: PersonaData
  cvFileData: CvFileData | null
  cvText: string
}

export async function adaptLetter(opts: AdaptOptions): Promise<AdaptResult> {
  const { apiKey, jobPosting, inputTab, baseLetter, signature, persona, cvFileData, cvText } = opts
  let body: object

  if (inputTab === 'cv') {
    const system = buildSystemPromptCV(signature, persona)
    let userContent: unknown
    if (cvFileData?.type === 'pdf') {
      userContent = [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: cvFileData.data } },
        { type: 'text', text: `Job Posting:\n\n${jobPosting}` },
      ]
    } else {
      const cvContent = cvFileData?.data || cvText
      userContent = `CV / Resume:\n\n${cvContent}\n\nJob Posting:\n\n${jobPosting}`
    }
    body = { model: 'claude-sonnet-4-6', max_tokens: 1400, system, messages: [{ role: 'user', content: userContent }] }
  } else {
    body = {
      model: 'claude-sonnet-4-6', max_tokens: 1400,
      system: buildSystemPrompt(baseLetter, signature, persona),
      messages: [{ role: 'user', content: `Job Posting:\n\n${jobPosting}` }],
    }
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({})) as { error?: { message?: string } }
    throw new Error(errData.error?.message || `API error ${res.status}`)
  }

  const data = await res.json()
  const raw = (data.content?.[0]?.text?.trim() || '') as string
  if (!raw) throw new Error('Empty response from API.')

  const delimIdx = raw.indexOf('---')
  if (delimIdx > -1) {
    return { companyName: raw.slice(0, delimIdx).trim(), letterText: raw.slice(delimIdx + 3).trim() }
  }
  return { companyName: '', letterText: raw }
}
