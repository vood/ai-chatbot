'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, CopyIcon, AlertCircle, Mail } from 'lucide-react';
import type { Contact } from '@/lib/db/schema';
import {
  getSigningContactsForDocument,
  saveContactEmails,
  generateSigningLinks,
  sendSigningEmails,
} from '@/lib/actions/signing';
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For errors

interface SigningSetupDialogProps {
  documentId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface GeneratedLink {
  url: string;
  contact_id: string;
}

// Schema for the email form
const createEmailSchema = (contacts: Contact[]) => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  contacts.forEach((contact) => {
    schemaFields[contact.id] = z
      .string()
      .email({ message: 'Invalid email.' })
      .nullable()
      .or(z.literal(''));
  });
  return z.object(schemaFields);
};

export function SigningSetupDialog({
  documentId,
  isOpen,
  onOpenChange,
}: SigningSetupDialogProps) {
  const [step, setStep] = useState<'loading' | 'emails' | 'links' | 'error'>(
    'loading',
  );
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [generatedLinks, setGeneratedLinks] = useState<GeneratedLink[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmittingTransition] = useTransition();
  const [isGenerating, startGeneratingTransition] = useTransition();
  const [isSendingEmails, startSendingEmailsTransition] = useTransition();
  const [emailsSent, setEmailsSent] = useState(false);

  // Fetch contacts when the dialog opens
  useEffect(() => {
    if (isOpen && documentId) {
      setStep('loading');
      setError(null);
      setGeneratedLinks([]); // Reset links
      const fetchContacts = async () => {
        const result = await getSigningContactsForDocument({ documentId });
        if (result.success && result.contacts) {
          setContacts(result.contacts);
          if (result.contacts.length === 0) {
            setError(
              'No contacts found associated with fields in this document.',
            );
            setStep('error');
          } else {
            setStep('emails');
          }
        } else {
          setError(result.error || 'Failed to load contacts.');
          setStep('error');
        }
      };
      fetchContacts();
    }
  }, [isOpen, documentId]);

  // Dynamic schema based on fetched contacts
  const emailSchema = createEmailSchema(contacts);
  type EmailFormValues = z.infer<typeof emailSchema>;

  // Form setup
  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    // Default values will be set in useEffect below once contacts are loaded
  });

  // Effect to reset form when contacts change
  useEffect(() => {
    if (contacts.length > 0) {
      const defaultValues = contacts.reduce(
        (acc, contact) => {
          acc[contact.id] = contact.email || '';
          return acc;
        },
        {} as Record<string, string>,
      );
      form.reset(defaultValues);
    }
  }, [contacts, form.reset]);

  // Handle saving emails and generating links
  const onSubmitEmails = (values: EmailFormValues) => {
    startSubmittingTransition(() => {
      const saveAndGenerate = async () => {
        setError(null);
        const saveResult = await saveContactEmails({ emails: values });

        if (!saveResult.success) {
          setError(saveResult.error || 'Failed to save emails.');
          toast.error(saveResult.error || 'Failed to save emails.');
          return;
        }

        toast.success('Emails saved successfully.');

        // Now generate links
        startGeneratingTransition(() => {
          const generateAction = async () => {
            try {
              const generateResult = await generateSigningLinks({ documentId });
              if (generateResult.success && generateResult.links.length > 0) {
                setGeneratedLinks(generateResult.links);
                setStep('links');
                toast.success(
                  `Generated ${generateResult.links.length} signing link(s).`,
                );
              } else if (generateResult.success) {
                setError(
                  'Could not generate signing links after saving emails.',
                );
                setStep('error');
                toast.warning(
                  'Emails saved, but failed to generate links. No contacts found?',
                );
              }
            } catch (genError) {
              const message =
                genError instanceof Error
                  ? genError.message
                  : 'Failed to generate signing links.';
              setError(message);
              setStep('error');
              toast.error(message);
            }
          };
          generateAction();
        });
      };
      saveAndGenerate();
    });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  // Close handler resets state
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing manually
      setTimeout(() => {
        // Delay reset slightly to allow fade out
        setStep('loading');
        setContacts([]);
        setError(null);
        setGeneratedLinks([]);
        setEmailsSent(false);
        form.reset({});
      }, 150);
    }
    onOpenChange(open); // Propagate state up
  };

  // Add function to handle sending emails
  const handleSendEmails = () => {
    startSendingEmailsTransition(() => {
      // Mark as sending
      const sendEmails = async () => {
        try {
          // Get the document title from the first contact's document (if available)
          const documentTitle = 'Document for Signing';
          if (contacts.length > 0 && generatedLinks.length > 0) {
            const result = await sendSigningEmails({
              documentId,
              documentTitle,
            });

            if (result.success) {
              setEmailsSent(true);
              toast.success(
                `${result.sentCount} signing invitation${result.sentCount !== 1 ? 's' : ''} sent by email`,
              );
            } else {
              toast.error(result.error || 'Failed to send emails');
            }
          } else {
            toast.error('No valid contacts to send emails to');
          }
        } catch (error) {
          console.error('Error sending emails:', error);
          toast.error('Failed to send emails');
        }
      };

      // Execute the async function
      sendEmails();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'emails' && 'Enter Signer Emails'}
            {step === 'links' && 'Signing Links Generated'}
            {(step === 'loading' || step === 'error') && 'Send for Signing'}
          </DialogTitle>
          {step === 'emails' && (
            <DialogDescription>
              Enter the email address for each signer below. These emails are
              not used automatically yet but will be stored.
            </DialogDescription>
          )}
          {step === 'links' && (
            <DialogDescription>
              Share these unique links with the corresponding signers.
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Loading State */}
        {step === 'loading' && (
          <div className="py-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {step === 'error' && (
          <>
            <Alert variant="destructive" className="my-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error || 'An unexpected error occurred.'}
              </AlertDescription>
            </Alert>

            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* Email Input Step */}
        {step === 'emails' && (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitEmails)}
              className="space-y-4 py-4"
            >
              {contacts.map((contact) => (
                <FormField
                  key={contact.id}
                  control={form.control}
                  name={contact.id}
                  render={({ field }) => (
                    <FormItem className="grid grid-cols-4 items-center gap-4">
                      <FormLabel className="text-right col-span-1">
                        {contact.name}
                      </FormLabel>
                      <FormControl className="col-span-3">
                        <Input
                          placeholder="signer@example.com"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage className="col-span-3 col-start-2" />
                    </FormItem>
                  )}
                />
              ))}
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting || isGenerating}>
                  {(isSubmitting || isGenerating) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting
                    ? 'Saving Emails...'
                    : isGenerating
                      ? 'Generating Links...'
                      : 'Save Emails & Generate Links'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}

        {/* Links Display Step */}
        {step === 'links' && (
          <>
            <div className="grid gap-4 py-4 max-h-[400px] overflow-y-auto">
              {generatedLinks.map((link) => {
                const contactName =
                  contacts.find((c) => c.id === link.contact_id)?.name ||
                  `Signer (${link.contact_id.substring(0, 6)}...)`;
                return (
                  <div key={link.url} className="flex items-center space-x-2">
                    <Label
                      htmlFor={`link-${link.contact_id}`}
                      className="text-right w-28 shrink-0 truncate"
                      title={contactName}
                    >
                      {contactName}
                    </Label>
                    <Input
                      id={`link-${link.contact_id}`}
                      value={link.url}
                      readOnly
                      className="flex-grow"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyLink(link.url)}
                      title="Copy Link"
                    >
                      <CopyIcon className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="flex justify-between mt-4">
              <Button
                type="button"
                onClick={handleSendEmails}
                disabled={isSendingEmails || emailsSent}
                variant="default"
              >
                {isSendingEmails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : emailsSent ? (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Emails Sent
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitations by Email
                  </>
                )}
              </Button>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Add SendForSigningTrigger component
type RenderProp = (
  triggerFn: () => void,
  isPending: boolean,
) => React.ReactNode;

interface SendForSigningTriggerProps {
  documentId: string;
  children: RenderProp;
}

export function SendForSigningTrigger({
  documentId,
  children,
}: SendForSigningTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Function that will be passed to the render prop
  const handleOpen = () => {
    if (documentId) {
      setIsOpen(true);
    }
  };

  // Only render dialog if we have a valid documentId
  const hasValidDocumentId = !!documentId && documentId.trim() !== '';

  return (
    <>
      {children(handleOpen, false)}
      {hasValidDocumentId && (
        <SigningSetupDialog
          documentId={documentId}
          isOpen={isOpen}
          onOpenChange={setIsOpen}
        />
      )}
    </>
  );
}
