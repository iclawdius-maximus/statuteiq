import { openai } from '../lib/openai';

const MODEL = 'qwen2.5:7b';
const TEXT_CAP = 2000;

export async function generateCitation(statute: {
  title: string;
  section: string;
  text: string;
}): Promise<{ citation: string; note: string }> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a legal citation expert.' },
      {
        role: 'user',
        content: `Generate a Bluebook citation for Ohio Revised Code § ${statute.section}, titled ${statute.title}. Then provide a one-sentence note on when lawyers commonly cite this type of statute. Respond as JSON: {"citation": "...", "note": "..."}`,
      },
    ],
  });

  const content = response.choices[0].message.content ?? '{}';
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content);
  return { citation: parsed.citation ?? '', note: parsed.note ?? '' };
}

export async function generateClientLetter(
  statute: { title: string; section: string; text: string },
  clientName: string,
  situation?: string
): Promise<string> {
  const textSnippet = statute.text.slice(0, TEXT_CAP);
  const situationLine = situation?.trim()
    ? ` Relate it specifically to this situation: ${situation.trim()}.`
    : '';

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are a professional legal assistant drafting clear client communications.',
      },
      {
        role: 'user',
        content: `Write a 3-4 paragraph client letter addressed to ${clientName} explaining Ohio Revised Code § ${statute.section} (${statute.title}) in plain English.${situationLine} The letter should explain: 1) what the law says, 2) what it means for the client practically, 3) recommended next steps. Law text for reference (first 2000 chars): ${textSnippet}`,
      },
    ],
  });

  return response.choices[0].message.content ?? '';
}
