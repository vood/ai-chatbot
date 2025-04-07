import { auth } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

import { getSuggestionsByDocumentId } from '@/lib/db/queries';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Missing documentId parameter' }, { status: 400 });
    }

    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const suggestions = await getSuggestionsByDocumentId({
      documentId,
    });

    return NextResponse.json({ suggestions });

  } catch (error) {
    console.error('Error fetching suggestions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch suggestions', details: errorMessage },
      { status: 500 },
    );
  }
}
