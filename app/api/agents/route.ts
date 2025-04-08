import { NextResponse } from 'next/server';
import { auth } from '@/lib/supabase/server';
import {
  getAgentsForUser,
  createAgent,
  updateAgent,
  deleteAgent,
  createFileRecord,
  type AgentInsert,
  type FileInsert,
  getAssistantFiles,
} from '@/lib/db/queries/agents';
import { createClient } from '@/lib/supabase/server';

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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // If id is provided, get the agent's files
    if (id) {
      try {
        const files = await getAssistantFiles(id);
        return NextResponse.json(files);
      } catch (error: any) {
        console.error('Error fetching agent files:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Otherwise get all agents
    const agents = await getAgentsForUser(user.id, workspaceId);
    return NextResponse.json(agents);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
    const { files, knowledge_files, ...agentData } = body;

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

export async function PUT(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    const workspaceId = user.current_workspace;
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'No workspace selected' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { files, knowledge_files, ...agentData } = body;

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

    const agent = await updateAgent(id, agentData, fileIds);
    return NextResponse.json(agent);
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing agent ID' }, { status: 400 });
    }

    await deleteAgent(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in agents API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
