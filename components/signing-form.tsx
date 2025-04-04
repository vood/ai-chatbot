'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitSignedDocument } from '@/lib/actions/signing';
import type { Document, Contact, ContractField } from '@/lib/db/schema';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SigningFormProps {
  document: Document;
  fields: ContractField[];
  contact: Contact;
  token: string;
}

// Dynamically create a Zod schema based on the required fields
const createSigningSchema = (fields: ContractField[]) => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    let fieldSchema = z.string();
    if (field.is_required) {
      fieldSchema = fieldSchema.min(1, {
        message: `${field.field_name} is required.`,
      });
    }
    if (field.field_type === 'email') {
      fieldSchema = fieldSchema.email({ message: 'Invalid email address.' });
    }
    schemaObject[field.id] = field.is_required
      ? fieldSchema
      : fieldSchema.optional().or(z.literal(''));
  });
  return z.object(schemaObject);
};

// Simple component to visually highlight the fields in the document
const HighlightedField = ({ children }: { children: React.ReactNode }) => (
  <span className="bg-yellow-200 dark:bg-yellow-700 px-1 py-0.5 rounded-sm font-medium">
    {children}
  </span>
);

// Helper function to escape special characters for regex
const escapeRegex = (s: string) =>
  s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&');

// NEW: Manual highlighting function
const renderContentWithHighlights = (
  content: string,
  fields: ContractField[],
): React.ReactNode[] => {
  const placeholders = fields
    .map((f) => f.placeholder_text)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);

  if (placeholders.length === 0) {
    // Render full content as Markdown if no fields or placeholders
    return [
      <ReactMarkdown key="full-content" remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>,
    ];
  }

  // Create a regex to match any of the placeholders, ensuring capture group
  const regex = new RegExp(`(${placeholders.map(escapeRegex).join('|')})`, 'g');

  const parts = content.split(regex);
  const nodes: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (part !== undefined && part !== null) {
      // Check part validity
      // Determine if the part is one of the exact placeholders
      const isPlaceholder = placeholders.includes(part);
      if (isPlaceholder) {
        // Wrap placeholders with the highlight component
        nodes.push(
          <HighlightedField key={`highlight-${part}-${index}`}>
            {part}
          </HighlightedField>,
        );
      } else if (part.length > 0) {
        // Avoid rendering empty strings
        // Render non-placeholder text segments using ReactMarkdown
        // Use a wrapper like <span> or <> fragment if needed, though often unnecessary
        nodes.push(
          <ReactMarkdown
            key={`text-${index}`}
            remarkPlugins={[remarkGfm]}
            className="inline"
          >
            {part}
          </ReactMarkdown>,
        );
      }
    }
  });

  return nodes;
};

export default function SigningForm({
  document,
  fields,
  contact,
  token,
}: SigningFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const formSchema = createSigningSchema(fields);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: fields.reduce(
      (acc, field) => {
        acc[field.id] = field.field_value || '';
        return acc;
      },
      {} as Record<string, string>,
    ),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setSubmissionError(null);
    const fieldValuesForAction = Object.entries(values).reduce(
      (acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      },
      {} as Record<string, string | null>,
    );

    startTransition(() => {
      const submitAction = async () => {
        try {
          const result = await submitSignedDocument({
            token,
            fieldValues: fieldValuesForAction,
          });

          if (result.success) {
            toast.success(result.message || 'Document submitted successfully.');
            form.reset();
          } else {
            setSubmissionError(
              result.message || 'Submission failed. Please try again.',
            );
            toast.error(result.message || 'Failed to submit document.');
          }
        } catch (error) {
          console.error('Error submitting document:', error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred.';
          setSubmissionError(`Submission failed: ${errorMessage}`);
          toast.error(`An unexpected error occurred: ${errorMessage}`);
        }
      };
      submitAction();
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Document Content: Render using manual highlighting */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Document Content</h3>
          <ScrollArea className="h-96 w-full rounded-md border p-4 bg-background text-sm">
            <div className="whitespace-pre-wrap">
              {renderContentWithHighlights(document.content, fields)}
            </div>
          </ScrollArea>
        </div>

        {/* Dynamically Render Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fields for {contact.name}</h3>
          {fields.map((field) => (
            <FormField
              key={field.id}
              control={form.control}
              name={field.id}
              render={({ field: rhfField }) => (
                <FormItem>
                  <FormLabel>
                    {field.field_name}
                    {field.is_required ? ' *' : ''}
                  </FormLabel>
                  <FormControl>
                    {field.field_type === 'signature' ? (
                      <div className="p-4 border rounded-md bg-gray-100 text-center text-gray-500">
                        Signature Pad Placeholder (Field: {field.field_name})
                      </div>
                    ) : field.field_type === 'date' ? (
                      <Input
                        type="date"
                        {...rhfField}
                        value={rhfField.value ?? ''}
                      />
                    ) : (
                      <Input
                        placeholder={`Enter ${field.field_name}`}
                        {...rhfField}
                        value={rhfField.value ?? ''}
                      />
                    )}
                  </FormControl>
                  <FormDescription></FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        {submissionError && (
          <p className="text-sm font-medium text-destructive">
            {submissionError}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isPending ? 'Submitting...' : 'Submit Signed Document'}
        </Button>
      </form>
    </Form>
  );
}
