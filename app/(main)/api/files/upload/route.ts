import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

import { auth } from '@/lib/supabase/server';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    // Allow common image types for message_images bucket
    // Expand this if the 'files' bucket needs different/more types
    .refine(
      (file) =>
        [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          // Add other allowed types for the 'files' bucket here if needed
          // 'application/pdf',
          // 'text/plain',
        ].includes(file.type),
      {
        message: 'Unsupported file type.', // More generic message
      },
    ),
});

export async function POST(request: Request) {
  const user = await auth();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore: ReadonlyRequestCookies = cookies();

  // Configure Supabase client for Route Handler (read-only cookies)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // No set/remove needed for Route Handler client instance
      },
    },
  );

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const originalFile = formData.get('file') as File | null;
    const filename = originalFile?.name;

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();

    const isImage = file.type.startsWith('image/');
    const bucketName = isImage ? 'message_images' : 'files';

    const filePath = `${user.id}/${Date.now()}-${filename}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Supabase Upload Error:', uploadError);
        return NextResponse.json(
          { error: `Upload failed: ${uploadError.message}` },
          { status: 500 },
        );
      }

      return NextResponse.json({ path: `${bucketName}/${filePath}` });
    } catch (error: any) {
      console.error('Upload Process Error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Request Processing Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
