import { tool } from 'ai';
import { z } from 'zod';

function searchGoogle(query: string) {
  return fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query }),
  }).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Google Search API request failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  });
}

function searchImages(query: string) {
  return fetch('https://google.serper.dev/images', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query }),
  }).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Google Images API request failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  });
}

function searchVideos(query: string) {
  return fetch('https://google.serper.dev/videos', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY as string,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: query }),
  }).then((res) => {
    if (!res.ok) {
      throw new Error(
        `Google Videos API request failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  });
}

export const webSearch = tool({
  description: 'Search Google for information on any topic',
  parameters: z.object({
    query: z.string(),
  }),
  execute: async (params: any) => {
    console.log('Starting googleSearch function');

    const query =
      'parameters' in params ? params.parameters.query : params.query;

    console.log({ query }, 'Received search query');

    if (query === undefined) {
      console.error('Query is missing');
      throw new Error('Query is required');
    }

    try {
      console.log('Sending request to Google Search API');
      const result = await Promise.all([
        searchGoogle(query),
        searchImages(query),
        searchVideos(query),
      ]);

      console.log('Google Search results received');

      return {
        organic: result[0].organic.slice(0, 10),
        images: result[1].images.slice(0, 10),
        relatedSearches: result[0].relatedSearches,
        videos: result[2].videos.slice(0, 10),
      };
    } catch (error) {
      console.error('Error performing Google search:', error);
      throw error;
    }
  },
});
