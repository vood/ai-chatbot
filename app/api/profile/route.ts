import { auth } from '@/lib/supabase/server';
import {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
} from '@/lib/db/queries';
import { type NextRequest, NextResponse } from 'next/server';

// API route for saving profile data
export async function POST(req: NextRequest) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();

    await updateUserProfile({
      userId: user.id,
      profileData: data,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for getting profile data
export async function GET() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileData = await getUserProfile({ userId: user.id });

    // Return profile data or empty object if not found
    return NextResponse.json(profileData);
  } catch (error: any) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// API route for deleting a user account
export async function DELETE() {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteUserAccount({ userId: user.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete account API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
