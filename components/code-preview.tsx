'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { XIcon } from 'lucide-react';

interface CodePreviewProps {
  htmlContent: string;
  onClose: () => void;
}

export function CodePreview({ htmlContent, onClose }: CodePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <Card className="relative border shadow-lg h-full flex flex-col overflow-hidden rounded-none">
      <CardContent className="p-0 flex-grow min-h-0">
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-0"
          title="HTML/CSS Code Preview"
          srcDoc={htmlContent}
        />
      </CardContent>
    </Card>
  );
}
