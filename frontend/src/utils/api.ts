// src/utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function getVideoSummary(videoUrl: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ video_url: videoUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      return null;
    }

    const data = await response.json();
    return data.summary;
  } catch (error) {
    console.error('Failed to fetch video summary:', error);
    return null;
  }
}