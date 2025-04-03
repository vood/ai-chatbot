'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export const Overview = async ({
  displayName,
  isLoggedIn,
}: { displayName: string; isLoggedIn: boolean }) => {
  // Get user display name and login status from server action

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        {/* Greeting section */}
        <div className="pb-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Hello, {displayName}!
          </h1>
          {isLoggedIn && (
            <p className="mt-2 text-muted-foreground">
              Not your name?{' '}
              <Link
                href="/profile"
                className="text-primary underline underline-offset-4"
              >
                Edit your profile
              </Link>
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
