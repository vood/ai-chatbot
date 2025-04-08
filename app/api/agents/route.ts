import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/server';
import {
  getAgentsForUser,
  createAgent,
  createFileRecord,
  type AgentInsert,
  type FileInsert,
} from '@/lib/db/queries/agents';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Define Zod schemas for validation
const FileSchema = z.object({
  id: z.string().uuid().optional(),
  file_path: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  size: z.number(),
  type: z.string(),
  tokens: z.number().optional().default(0),
});

export const AgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  instructions: z.string().optional(),
  prompt: z.string().min(1, { message: 'Prompt is required' }),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(1).default(0.7),
  context_length: z.number().int().min(1).default(4000),
  embeddings_provider: z.string().default('openai'),
  image_path: z.string().default(''),
  include_profile_context: z.boolean().default(false),
  include_workspace_instructions: z.boolean().default(false),
  sharing: z.string().default('private'),
  metadata: z.record(z.any()).optional(),
  files: z.array(FileSchema).optional(),
  conversation_starters: z.array(z.string()).optional(),
});

// GET all agents
export async function GET(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    // Get all agents
    const agents = await getAgentsForUser(user.id, workspaceId);
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST create an agent
export async function POST(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Debug log to see incoming data structure
    console.log(
      'POST /api/agents received body:',
      JSON.stringify(
        {
          hasFiles: !!body.files,
          filesLength: body.files?.length || 0,
          filesSample: body.files?.slice(0, 2) || [],
        },
        null,
        2,
      ),
    );

    // Validate request body with Zod schema
    const validation = AgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid agent data', issues: validation.error.format() },
        { status: 400 },
      );
    }

    const { files, ...agentData } = validation.data;

    const fileIds: string[] = [];

    // First handle file uploads if any
    if (files && Array.isArray(files) && files.length > 0) {
      const supabase = createClient();

      // Process each file
      for (const file of files) {
        try {
          // Skip if file data is missing
          if (!file.file_path || !file.name || !file.size || !file.type) {
            console.warn('Skipping file with missing data:', file);
            continue;
          }

          // Create file record in database
          const fileRecord: FileInsert = {
            file_path: file.file_path,
            name: file.name,
            description: file.description || '',
            size: file.size,
            type: file.type,
            tokens: file.tokens || 0,
            sharing: 'private',
            user_id: user.id,
          };

          const createdFile = await createFileRecord(fileRecord, workspaceId);
          fileIds.push(createdFile.id);
        } catch (error) {
          console.error('Error processing file:', error);
          // Continue with other files if one fails
        }
      }
    }

    // Then create the agent with file associations
    const agent: AgentInsert = {
      ...agentData,
      user_id: user.id,
      // Always set embeddings_provider to "openai"
      embeddings_provider: 'openai',
    };

    const createdAgent = await createAgent(agent, workspaceId, fileIds);
    return NextResponse.json(createdAgent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
