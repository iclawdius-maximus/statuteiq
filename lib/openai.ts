import OpenAI from 'openai';
import { Platform } from 'react-native';

const GROQ_API_KEY =
  Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '')
    : (process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '');

export const openai = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: GROQ_API_KEY || 'placeholder',
  dangerouslyAllowBrowser: true,
});
