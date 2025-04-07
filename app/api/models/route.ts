import { NextResponse } from 'next/server';

// Define the model type for clarity, matching the expected structure
interface OpenRouterModel {
  slug: string;
  name: string;
  short_name: string;
  description: string;
  created_at: string;
  context_length: number;
  endpoint?: {
    provider_info: {
      name: string;
      displayName: string;
      icon?: {
        url?: string;
      };
    };
    provider_display_name: string;
    provider_name: string;
    pricing: {
      prompt: string;
      completion: string;
    };
    supports_tool_parameters: boolean;
    context_length: number;
  };
}

export async function GET() {
  try {
    const response = await fetch('https://openrouter.ai/api/frontend/models', {
      headers: {
        // Add any necessary headers if required by OpenRouter in the future
        Accept: 'application/json',
      },
      // Optional: Configure caching behavior if needed
      // next: { revalidate: 3600 }, // Revalidate every hour, for example
    });

    if (!response.ok) {
      console.error(
        `Proxy failed to fetch models: ${response.status} ${response.statusText}`,
      );
      // Forward the error status and message if possible
      return NextResponse.json(
        { error: `Failed to fetch models from source: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Return the data received from OpenRouter
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in proxy API route for models:', error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || 'Unknown error'}` },
      { status: 500 },
    );
  }
}
