'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition, useEffect, Suspense } from 'react';

import { createClient } from '@/lib/supabase/client'; // Import Supabase browser client
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from "lucide-react"; // Import Loader2 directly

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isVerifyPending, startVerifyTransition] = useTransition();
  const [isGooglePending, startGoogleTransition] = useTransition();

  const supabase = createClient(); // Initialize Supabase client

  // Handle URL error parameters (e.g., from auth callback)
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleRequestOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Use OTP (code) instead of magiclink (default)
          emailRedirectTo: undefined, // Not needed for OTP codes
          shouldCreateUser: true, // Allow signup with OTP
        },
      });

      if (error) {
        console.error('OTP Request Error:', error);
        setError(error.message);
      } else {
        setMessage('Check your email for the verification code');
        setShowOtpInput(true);
      }
    });
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter a valid verification code');
      return;
    }
    
    startVerifyTransition(async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (error) {
        console.error('OTP Verification Error:', error);
        setError(error.message);
      } else {
        // Successfully verified OTP
        setMessage('Successfully logged in!');
        // Redirect to home or dashboard
        router.push('/');
        router.refresh();
      }
    });
  };

  const handleSignInWithGoogle = async () => {
    setError(null);
    setMessage(null);
    startGoogleTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('Google Sign In Error:', error);
        setError(error.message);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            {showOtpInput 
              ? "Enter the verification code sent to your email"
              : "Enter your email to receive a verification code or use Google"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!showOtpInput ? (
            /* Email form to request OTP */
            <form onSubmit={handleRequestOtp} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending || isGooglePending}
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-600 dark:text-green-500">{message}</p>
              )}
              <Button type="submit" className="w-full" disabled={isPending || isGooglePending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Verification Code
              </Button>
            </form>
          ) : (
            /* OTP Verification form */
            <form onSubmit={handleVerifyOtp} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  disabled={isVerifyPending}
                  maxLength={6}
                  minLength={6}
                  pattern="[0-9]{6}" // Enforce 6-digit number
                  inputMode="numeric" // Show numeric keyboard on mobile
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-500">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-600 dark:text-green-500">{message}</p>
              )}
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowOtpInput(false)}
                  disabled={isVerifyPending}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isVerifyPending}>
                  {isVerifyPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify
                </Button>
              </div>
            </form>
          )}

          {!showOtpInput && (
            <>
              {/* Divider */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              {/* Google Sign In Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSignInWithGoogle}
                disabled={isPending || isGooglePending}
              >
                {isGooglePending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                )}
                Google
              </Button>
            </>
          )}
        </CardContent>
        <CardFooter className="text-sm">
          Don&apos;t have an account?{' '}
          <Link href="#" className="underline ml-1">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
