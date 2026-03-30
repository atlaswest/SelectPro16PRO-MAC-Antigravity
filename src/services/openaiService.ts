import { SelectionResult } from "./geminiService";

const isAiEnabled = import.meta.env.VITE_ENABLE_AI !== 'false';

export async function analyzePhotoWithOpenAI(base64Data: string, filename: string): Promise<SelectionResult> {
  if (!isAiEnabled) {
    throw new Error("AI features are disabled in this build.");
  }
  // We'll call our own backend to keep the OpenAI key secure
  const response = await fetch('/api/analyze/openai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ base64Data, filename }),
  });

  if (!response.ok) {
    throw new Error('OpenAI analysis failed');
  }

  return response.json();
}
