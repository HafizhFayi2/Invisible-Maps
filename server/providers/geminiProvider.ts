import { getGeminiApiKeys } from '../utils/env';
import { executeWithFailover } from '../utils/failover';

interface DiscoverySuggestion {
  name: string;
  category: string;
  reason: string;
  matchScore: number;
}

export interface GeminiDiscoveryResponse {
  suggestions: DiscoverySuggestion[];
}

const fallbackSuggestions: GeminiDiscoveryResponse = {
  suggestions: [
    {
      name: 'Sate Taichan Pak Kumis',
      category: 'Street Food',
      reason: 'Top local favorite with strong late-night demand.',
      matchScore: 98,
    },
    {
      name: 'Kopi Tarik Cik Lin',
      category: 'Coffee',
      reason: 'Consistently high repeat visits from nearby office workers.',
      matchScore: 90,
    },
    {
      name: 'Berkah Laundry',
      category: 'Service',
      reason: 'Fast turnaround and high trust score from neighborhood scans.',
      matchScore: 87,
    },
  ],
};

function buildPrompt(userLocation: string): string {
  return [
    'You are an expert local guide for Surabaya/Jakarta specializing in informal MSMEs and hidden gems.',
    `Based on the current location ${userLocation}, suggest 3 unique informal street food or local services.`,
    'Output strict JSON only with shape: {"suggestions":[{"name":"","category":"","reason":"","matchScore":0}]}.',
  ].join(' ');
}

function parseJsonResponse(raw: string): GeminiDiscoveryResponse | null {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as GeminiDiscoveryResponse;
    if (!parsed?.suggestions || !Array.isArray(parsed.suggestions)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

async function callGeminiApi(apiKey: string, prompt: string): Promise<GeminiDiscoveryResponse> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const parsed = parseJsonResponse(text);

  if (!parsed) {
    throw new Error('Gemini returned non-JSON response');
  }

  return parsed;
}

export async function getDiscoveryPicks(userLocation: string): Promise<{ data: GeminiDiscoveryResponse; provider: string }> {
  const apiKeys = getGeminiApiKeys();
  const prompt = buildPrompt(userLocation);
  const providers = apiKeys.map((apiKey, index) => ({
    name: `gemini-key-${index + 1}`,
    request: () => callGeminiApi(apiKey, prompt),
  }));

  providers.push({
    name: 'fallback-local-ai',
    request: async () => fallbackSuggestions,
  });

  const result = await executeWithFailover(providers);

  return {
    data: result.data,
    provider: result.provider,
  };
}
