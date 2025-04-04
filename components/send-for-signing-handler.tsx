'use client';

import { useState, useTransition } from 'react';
import { generateSigningLinks } from '@/lib/actions/signing';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CopyIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Interface for the link data returned by the action
interface GeneratedLink {
  url: string;
  contact_id: string;
}

// Component props: expects documentId and a children function
interface TriggerProps {
  documentId: string;
  // Children function receives the trigger and pending state
  children: (triggerFn: () => void, isPending: boolean) => React.ReactNode;
}

// Main component: Renders children and manages the signing link generation/dialog
export const SendForSigningTrigger = ({
  documentId,
  children,
}: TriggerProps) => {
  const [isPending, startTransition] = useTransition();
  const [showDialog, setShowDialog] = useState(false);
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);

  // Function to initiate the signing link generation
  const handleSendForSigning = () => {
    if (!documentId) {
      toast.error('Document ID is missing.');
      return;
    }

    // Use transition for loading state
    startTransition(async () => {
      try {
        setGeneratedLinks([]); // Clear previous links
        // Call the server action
        const result = await generateSigningLinks({ documentId });

        // Handle successful generation with links
        if (result.success && result.links.length > 0) {
          setGeneratedLinks(result.links);
          setShowDialog(true); // Show the dialog with links
          toast.success(`Generated ${result.links.length} signing link(s).`);
        }
        // Handle successful generation but no links (no contacts/fields)
        else if (result.success && result.links.length === 0) {
          toast.info(
            'No contacts with fields found in this document to send for signing.',
          );
        }
        // If result.success is false, the action should have thrown an error
        // caught by the catch block below. No explicit 'else' needed here.
      } catch (error) {
        // Catch errors thrown by the action
        console.error('Error generating signing links:', error);
        toast.error(
          error instanceof Error ? error.message : 'An unknown error occurred.',
        );
      }
    });
  };

  // Helper to copy link to clipboard
  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  return (
    <>
      {/* Render the trigger element provided by the parent */}
      {children(handleSendForSigning, isPending)}

      {/* Dialog displays the generated links */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Signing Links Generated</DialogTitle>
            <DialogDescription>
              Share these links with the corresponding signers. Links are unique
              per signer.
            </DialogDescription>
          </DialogHeader>
          {/* Scrollable area for links */}
          <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
            {generatedLinks.map((link) => (
              // Use link.url as the unique key
              <div key={link.url} className="flex items-center space-x-2">
                <Label
                  htmlFor={`link-${link.contact_id}`}
                  className="text-right w-24 shrink-0 truncate"
                  title={`Contact ID: ${link.contact_id}`}
                >
                  {/* TODO: Fetch and display actual Contact Name based on contact_id */}
                  Signer ({link.contact_id.substring(0, 6)}...)
                </Label>
                <Input
                  id={`link-${link.contact_id}`}
                  value={link.url}
                  readOnly
                  className="flex-grow"
                />
                {/* Copy button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyLink(link.url)}
                  title="Copy Link"
                >
                  <CopyIcon className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {/* Dialog footer with close button */}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
