'use client'; // Mark as client component

import { useRouter } from 'next/navigation';
import { toast } from '@/components/toast';
import { createClient } from '@/lib/supabase/client';

export const SignOutForm = () => {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Prevent default form submission

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Sign out error:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to sign out.',
      });
    } else {
      // Refresh the page to update session state and redirect (handled by middleware/page logic)
      router.refresh();
      // You could also redirect explicitly:
      // router.push('/');
      toast({
          type: 'success',
          description: 'Signed out successfully.'
      });
    }
  };

  return (
    // Use onSubmit instead of action
    <form className="w-full" onSubmit={handleSignOut}>
      <button
        type="submit"
        className="w-full text-left px-1 py-0.5 text-red-500"
      >
        Sign out
      </button>
    </form>
  );
};
