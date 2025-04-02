'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/toast';

export default function Page() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');

  const handleSubmit = async (formData: FormData) => {
    setEmail(formData.get('email') as string);
    const password = formData.get('password') as string;
    const emailValue = formData.get('email') as string;

    if (!emailValue || !password) {
        toast({
            type: 'error',
            description: 'Email and password are required',
        });
        return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailValue,
      password: password,
      options: {
        // Optional: Email confirmation is often enabled by default in Supabase.
        // emailRedirectTo: `${location.origin}/api/auth/callback`, // Uncomment if you have a callback route
      },
    });

    if (error) {
      console.error('Signup error:', error);
      toast({
        type: 'error',
        description: error.message || 'Failed to create account!',
      });
    } else if (data.user) {
      // Check if email confirmation is required
      if (data.user.identities && data.user.identities.length === 0) {
        toast({
          type: 'success',
          description: 'Account created! Please check your email for confirmation.',
        });
        // Optionally redirect to a "check email" page
        // router.push('/check-email');
      } else {
        // User is created and confirmed (e.g., email confirmation disabled or auto-confirmed)
        toast({
          type: 'success',
          description: 'Account created successfully! You are now logged in.'
        });
        // Refresh the page to update server session state
        router.refresh();
        // Optionally redirect to home
        // router.push('/');
      }
    } else {
        // Should not happen in normal flow, but handle just in case
        toast({
            type: 'error',
            description: 'An unexpected error occurred during signup.',
        });
    }
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Create an account with your email and password
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton>Sign Up</SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {'Already have an account? '}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {' instead.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}
