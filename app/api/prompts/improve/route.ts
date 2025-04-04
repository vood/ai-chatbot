import { NextResponse } from 'next/server';
import { myProvider } from '@/lib/ai/providers';
import { generateObject } from 'ai';
import { z } from 'zod'; // Import zod for schema definition

// Schema for expected AI output
const improvementSchema = z.object({
  improvedName: z
    .string()
    .max(50)
    .describe('A concise, descriptive name for the prompt (max 50 chars).'),
  improvedContent: z.string().describe('The enhanced prompt content.'),
});

// Schema for validating the input request body
const inputSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty.'),
  content: z.string().min(1, 'Content cannot be empty.'),
});

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    // Validate the input body using the Zod schema
    const inputValidation = inputSchema.safeParse(requestBody);

    if (!inputValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: inputValidation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    // Use the validated data
    const { name, content } = inputValidation.data;

    const chatModel = myProvider.languageModel('chat-model');

    if (!chatModel) {
      return NextResponse.json(
        { error: 'Chat model is not configured or available.' },
        { status: 500 },
      );
    }

    // Updated prompt focusing on the task, removing JSON instructions
    const improvementPrompt = `You are an AI assistant specialized in refining user prompts. 
    Analyze the user-provided prompt name and content. 
    Generate an improved, concise, and descriptive name (strictly max 50 characters) for the prompt.
    Also generate enhanced prompt content that is clearer, more detailed, and more effective for its purpose.
    To enchace the prompt means to make it more consise, fix grammar. 
    It is a bad idea to make the prompt larger. 
    The prompt should be concise and to the point. 
    Don't change the variables like {variable}.

    Current Name: ${name}
    Current Content:
    ---
    ${content}
    ---`;

    // Call the AI model using generateObject with the schema
    const { object: improvedData } = await generateObject({
      // Destructure 'object'
      model: chatModel,
      schema: improvementSchema, // Pass the Zod schema directly
      prompt: improvementPrompt,
      temperature: 0.6,
      maxTokens: 1500,
    });

    // No manual parsing or validation needed
    // Data is already validated against the schema
    const { improvedName, improvedContent } = improvedData;

    return NextResponse.json({ improvedName, improvedContent });
  } catch (error: any) {
    console.error('Error improving prompt with AI:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: `AI prompt improvement failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
