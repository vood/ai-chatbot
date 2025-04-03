'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Sitelink {
  title: string;
  link: string;
}

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  sitelinks?: Sitelink[];
  position: number;
  attributes?: Record<string, string>;
  date?: string;
}

interface SearchResultsProps {
  results?: { organic: SearchResult[] };
  query?: string;
}

const SAMPLE_RESULTS: { organic: SearchResult[] } = {
  organic: [
    {
      title: 'Searching...',
      link: 'https://www.writingmate.ai',
      snippet: 'Searching for results... please wait...',
      position: 1,
    },
    {
      title: 'Searching...',
      link: 'https://www.writingmate.ai',
      snippet: 'Searching for results... please wait...',
      position: 2,
    },
    {
      title: 'Searching...',
      link: 'https://www.writingmate.ai',
      snippet: 'Searching for results... please wait...',
      position: 3,
    },
  ],
};

export default function SearchResults({
  results = SAMPLE_RESULTS,
  query = 'organic',
}: SearchResultsProps) {
  const [expanded, setExpanded] = useState(false);

  // Grid configuration
  const columns = 3;

  const organicResults = results.organic;
  // When not expanded, show first 3 results + expansion card
  // When expanded, show all results in a grid
  const visibleResults = expanded
    ? organicResults
    : organicResults?.slice(0, columns - 1);
  const remainingResults = organicResults?.slice(columns - 1);
  const hasMoreResults = remainingResults?.length > 0;

  // Calculate rows for all results when expanded
  const allRows = expanded
    ? Array.from(
        { length: Math.ceil(organicResults.length / columns) },
        (_, i) => organicResults.slice(i * columns, (i + 1) * columns),
      )
    : [];

  return (
    <div className="w-full space-y-3">
      {!expanded ? (
        // Non-expanded view: 3 cards + expansion card
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {/* First 3 result cards */}
          {visibleResults.map((result) => (
            <ResultCard key={result.position} result={result} />
          ))}

          {/* Expansion card */}
          {hasMoreResults && (
            <Card
              className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors h-full"
              onClick={() => setExpanded(true)}
            >
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <div className="flex flex-wrap justify-center gap-1 mb-1">
                  {/* Show up to 6 source icons */}
                  {remainingResults.slice(0, 6).map((result) => (
                    <SourceIcon
                      key={`icon-${result.position}`}
                      result={result}
                      size="small"
                    />
                  ))}

                  {/* If there are more than 6 remaining sources, show a +X indicator */}
                  {remainingResults.length > 6 && (
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                      +{remainingResults.length - 6}
                    </div>
                  )}
                </div>

                <span className="text-gray-500 text-sm font-medium flex items-center gap-1">
                  <ChevronDown className="h-3 w-3" />+{remainingResults.length}{' '}
                  more
                </span>
              </div>
            </Card>
          )}
        </div>
      ) : (
        // Expanded view: Grid of all results
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"
          >
            {organicResults.map((result) => (
              <motion.div
                key={result.position}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: result.position < columns ? 0 : 0.1, // Delay animation for cards beyond first row
                }}
              >
                <ResultCard result={result} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Subtle collapse button - only visible when expanded */}
      {expanded && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(false)}
            className="text-gray-400 hover:text-gray-600 hover:bg-transparent"
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            <span className="text-xs">Show less</span>
          </Button>
        </div>
      )}
    </div>
  );
}

// Helper component for individual result cards
function ResultCard({ result }: { result: SearchResult }) {
  return (
    <Card className="p-4 bg-gray-50 h-full">
      <div className="flex items-center gap-2 mb-2">
        <SourceIcon result={result} />
        <span className="text-gray-500 text-sm">
          {extractDomain(result.link)}
        </span>
      </div>

      <a
        href={result.link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-gray-700 line-clamp-2 hover:underline group flex items-start gap-1"
      >
        <span className="line-clamp-2">{result.snippet}</span>
        <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
      </a>
    </Card>
  );
}

// Helper component for source icons
function SourceIcon({
  result,
  size = 'normal',
}: {
  result: SearchResult;
  size?: 'normal' | 'small';
}) {
  const sizeClass = size === 'small' ? 'w-5 h-5' : 'w-6 h-6';
  const domain = extractDomain(result.link, true);
  const faviconUrl = `https://www.google.com/s2/favicons?size=64&domain=${domain}`;

  return (
    <div
      className={`${sizeClass} rounded-full bg-gray-200 flex items-center justify-center text-xs overflow-hidden`}
    >
      <img
        src={faviconUrl || '/placeholder.svg'}
        alt={domain}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to text initial if favicon fails to load
          e.currentTarget.style.display = 'none';
          const parentEl = e.currentTarget.parentElement;
          if (parentEl) {
            parentEl.innerHTML = getSourceInitial(result);
          }
        }}
      />
    </div>
  );
}

// Helper function to extract domain from URL
function extractDomain(url: string, includeSubdomain = false): string {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    if (includeSubdomain) {
      return hostname;
    }

    // Remove www. prefix if present
    const domain = hostname.replace(/^www\./, '');

    // Return just the main domain name (e.g., "google" from "google.com")
    return domain.split('.')[0];
  } catch {
    // Fallback for invalid URLs
    const parts = url.split('//')[1]?.split('/')[0]?.split('.');
    return parts ? parts[parts.length > 1 ? parts.length - 2 : 0] : 'source';
  }
}

// Helper function to get the first letter of the source
function getSourceInitial(result: SearchResult): string {
  try {
    const domain = new URL(result.link).hostname;
    return domain.replace('www.', '').charAt(0).toUpperCase();
  } catch {
    return 'S';
  }
}
