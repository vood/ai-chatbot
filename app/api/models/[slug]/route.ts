import { NextResponse } from 'next/server';

// Define the model type for clarity
interface OpenRouterModel {
  slug: string;
  endpoint?: {
    supports_tool_parameters: boolean;
  };
  // Add other necessary fields
}

// Route handler for GET /api/models/[slug]
export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug;

  if (!slug) {
    return NextResponse.json(
      { error: 'Model slug is required' },
      { status: 400 },
    );
  }

  try {
    // Fetch details for the specific model slug from OpenRouter
    // Adjust the URL if OpenRouter has a different endpoint for single models
    // Assuming the list endpoint can be filtered or we fetch the list and find it
    const response = await fetch(`https://openrouter.ai/api/frontend/models`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.error(
        `Proxy failed to fetch model ${slug}: ${response.status} ${response.statusText}`,
      );
      return NextResponse.json(
        { error: `Failed to fetch model details: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Find the specific model in the data array
    const modelData = data.data?.find((m: OpenRouterModel) => m.slug === slug);

    if (!modelData) {
      return NextResponse.json(
        { error: `Model with slug '${slug}' not found` },
        { status: 404 },
      );
    }

    // Return only the details for the requested model
    return NextResponse.json(modelData);
  } catch (error: any) {
    console.error(`Error fetching details for model ${slug}:`, error);
    return NextResponse.json(
      { error: `Internal Server Error: ${error.message || 'Unknown error'}` },
      { status: 500 },
    );
  }
}
