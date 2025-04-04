'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Textarea } from '@/components/ui/textarea'; // For potential multi-line fields
import { toast } from '@/components/ui/use-toast'; // Assuming Shadcn toast
import { submitSignedDocument } from '@/lib/actions/signing';
import type { Document, Contact, ContractField } from '@/lib/db/schema';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // To display document content

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
    // Basic string validation for now, can be enhanced based on field.field_type
    let fieldSchema = z.string();
    if (field.is_required) {
      fieldSchema = fieldSchema.min(1, {
        message: `${field.field_name} is required.`,
      });
    }
    if (field.field_type === 'email') {
      fieldSchema = fieldSchema.email({ message: 'Invalid email address.' });
    }
    // Add more type-specific validations as needed (e.g., date, phone)

    // Allow empty string if not required, otherwise use the base schema
    schemaObject[field.id] = field.is_required
      ? fieldSchema
      : fieldSchema.optional().or(z.literal(''));
  });
  return z.object(schemaObject);
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

  // Generate the schema dynamically
  const formSchema = createSigningSchema(fields);

  // Initialize react-hook-form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: fields.reduce(
      (acc, field) => {
        // Initialize with empty strings or existing values if re-signing is allowed (not implemented here)
        acc[field.id] = field.field_value || '';
        return acc;
      },
      {} as Record<string, string>,
    ),
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setSubmissionError(null);
    console.log('Submitting field values:', values);

    // Convert possibly empty strings to null for the backend if needed
    const fieldValuesForAction = Object.entries(values).reduce(
      (acc, [key, value]) => {
        acc[key] = value === '' ? null : value;
        return acc;
      },
      {} as Record<string, string | null>,
    );

    startTransition(async () => {
      try {
        const result = await submitSignedDocument({
          token,
          fieldValues: fieldValuesForAction,
        });

        if (result.success) {
          toast({
            title: 'Success!',
            description: result.message || 'Document submitted successfully.',
          });
          // Optionally redirect to a success page or disable the form
          // router.push('/sign/success');
          form.reset(); // Reset form on success
          // Consider disabling the form fields after successful submission
        } else {
          setSubmissionError(
            result.message || 'Submission failed. Please try again.',
          );
          toast({
            variant: 'destructive',
            title: 'Submission Error',
            description: result.message || 'Failed to submit document.',
          });
        }
      } catch (error) {
        console.error('Error submitting document:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.';
        setSubmissionError(`Submission failed: ${errorMessage}`);
        toast({
          variant: 'destructive',
          title: 'Submission Error',
          description: `An unexpected error occurred: ${errorMessage}`,
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Display Document Content (Read-only) */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Document Content</h3>
          <ScrollArea className="h-72 w-full rounded-md border p-4 bg-muted">
            <pre className="text-sm whitespace-pre-wrap">
              {document.content}
            </pre>
          </ScrollArea>
        </div>

        {/* Dynamically Render Fields */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Fields for {contact.name}</h3>
          {fields.map((field) => (
            <FormField
              key={field.id}
              control={form.control}
              name={field.id} // Use field ID as the name for react-hook-form
              render={(
                { field: rhfField }, // Rename to avoid conflict
              ) => (
                <FormItem>
                  <FormLabel>
                    {field.field_name}
                    {field.is_required ? ' *' : ''}
                  </FormLabel>
                  <FormControl>
                    {/* Basic Input for now, enhance based on field.field_type */}
                    {field.field_type === 'signature' ? (
                      <div className="p-4 border rounded-md bg-gray-100 text-center text-gray-500">
                        Signature Pad Placeholder (Field: {field.field_name})
                      </div>
                    ) : field.field_type === 'date' ? (
                      <Input
                        type="date"
                        {...rhfField}
                        value={rhfField.value || ''}
                      />
                    ) : (
                      <Input
                        placeholder={`Enter ${field.field_name}`}
                        {...rhfField}
                        value={rhfField.value || ''} // Ensure controlled component
                      />
                    )}
                  </FormControl>
                  <FormDescription>
                    {/* Add description based on field type if needed */}
                  </FormDescription>
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
