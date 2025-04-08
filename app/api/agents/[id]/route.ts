import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/server';
import {
  getAgentById,
  updateAgent,
  deleteAgent,
  createFileRecord,
  type FileInsert,
} from '@/lib/db/queries/agents';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { AgentSchema } from '../route';

// GET a single agent by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const agent = await getAgentById(id);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check if user has permission to access this agent
    if (agent.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update an agent
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = AgentSchema.partial().safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid agent data', issues: validation.error.format() },
        { status: 400 },
      );
    }

    const { files, ...agentData } = validation.data;

    // Ensure embeddings_provider is set
    if (!agentData.embeddings_provider) {
      agentData.embeddings_provider = 'openai';
    }

    const fileIds: string[] = [];

    // Handle file uploads if any
    if (files && Array.isArray(files) && files.length > 0) {
      const supabase = createClient();

      // Process each file
      for (const file of files) {
        try {
          // If file has an ID, it's already in the database
          if (file.id) {
            fileIds.push(file.id);
            continue;
          }

          // Skip if file data is missing
          if (!file.file_path || !file.name || !file.size || !file.type) {
            console.warn('Skipping file with missing data:', file);
            continue;
          }

          // Create new file record in database
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

    console.log('File IDs:', fileIds);

    const agent = await updateAgent(id, agentData, fileIds);
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE an agent
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
