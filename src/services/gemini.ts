import { getApiBaseUrl } from './config';

interface DiscoverySuggestion {
  name: string;
  category: string;
  reason: string;
  matchScore: number;
}

interface GeminiDiscoveryResponse {
  suggestions: DiscoverySuggestion[];
}

const fallbackResponse: GeminiDiscoveryResponse = {
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

export async function getAIDiscoveryPicks(userLocation: string): Promise<GeminiDiscoveryResponse | null> {
  const base = getApiBaseUrl();
  const endpoint = `${base}/api/ai/discovery`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userLocation }),
    });

    if (!response.ok) {
      throw new Error(`AI API ${response.status}`);
    }

    const json = (await response.json()) as { data?: GeminiDiscoveryResponse };
    return json.data ?? fallbackResponse;
  } catch {
    return fallbackResponse;
  }
}
