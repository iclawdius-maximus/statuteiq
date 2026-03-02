import OpenAI from 'openai';

// Uses Ollama's OpenAI-compatible endpoint — no API key needed, fully local
export const openai = new OpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
  dangerouslyAllowBrowser: true,
});
