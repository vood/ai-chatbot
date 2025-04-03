import { createClient, auth } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { text } = data;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    // Initialize OpenAI client
    const openai = new OpenAI();

    // Generate speech
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
    });

    // Convert to ArrayBuffer
    const buffer = await mp3.arrayBuffer();
    
    // Return audio as MP3
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.byteLength.toString(),
      },
    });
    
  } catch (error: any) {
    console.error('Error in TTS API:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
} 