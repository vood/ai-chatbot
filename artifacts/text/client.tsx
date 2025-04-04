import { Artifact } from '@/components/create-artifact';
import { DiffView } from '@/components/diffview';
import { DocumentSkeleton } from '@/components/document-skeleton';
import { Editor } from '@/components/text-editor';
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  PDFIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from '@/components/icons';
import type { Suggestion } from '@/lib/db/schema';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import { getContractFields, getSuggestions } from '../actions';
import { FormInputIcon, ScaleIcon } from 'lucide-react';
import type { DocumentAnnotation } from '@/components/artifact';

interface TextArtifactMetadata {
  suggestions: Array<Suggestion>;
  annotations: Array<DocumentAnnotation<any>>;
}

// Define type for document annotation stream content
interface DocumentAnnotationStreamContent {
  type: string;
  data: any;
}

export const textArtifact = new Artifact<'text', TextArtifactMetadata>({
  kind: 'text',
  description: 'Useful for text content, like drafting essays and emails.',
  initialize: async ({ documentId, setMetadata }) => {
    const suggestions = await getSuggestions({ documentId });
    const contractFields = await getContractFields({ documentId });

    console.log('contractFields', contractFields);

    // Create annotations for each field occurrence
    const annotations: Array<DocumentAnnotation<any>> = [];

    contractFields.forEach((field) => {
      // Check if the field has multiple occurrences
      if (field.position_in_document?.occurrences?.length) {
        // Create an annotation for each occurrence
        field.position_in_document.occurrences.forEach((occurrence: any) => {
          annotations.push({
            id: occurrence.id || field.id,
            type: 'contractField',
            data: {
              ...field,
              // Override position with the specific occurrence position
              position_in_document: {
                type: 'annotation',
                position: occurrence.position,
              },
              // Include the field definition id for reference
              field_definition_id: field.id,
              placeholder_text: occurrence.placeholder_text,
            },
          });
        });
      } else {
        // Fallback for backward compatibility with old format
        annotations.push({
          id: field.id,
          type: 'contractField',
          data: field,
        });
      }
    });

    setMetadata({
      suggestions,
      annotations,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'suggestion') {
      setMetadata((metadata) => {
        return {
          ...metadata,
          suggestions: [
            ...metadata.suggestions,
            streamPart.content as Suggestion,
          ],
        };
      });
    }

    // Handle document annotations
    if (streamPart.type === 'annotation') {
      const annotationContent =
        streamPart.content as DocumentAnnotationStreamContent;

      if (annotationContent && typeof annotationContent === 'object') {
        setMetadata((metadata) => {
          const annotations = [...(metadata.annotations || [])];

          // Handle contract field annotations with multiple occurrences
          if (
            annotationContent.type === 'contractField' &&
            annotationContent.data?.definition &&
            annotationContent.data?.occurrence
          ) {
            const { definition, occurrence } = annotationContent.data;

            // Create a merged annotation object
            const newAnnotation = {
              id: occurrence.id || crypto.randomUUID(),
              type: 'contractField',
              data: {
                ...definition,
                // Set the specific position for this occurrence
                position_in_document: {
                  type: 'annotation',
                  position: occurrence.position,
                },
                // Keep reference to definition ID
                field_definition_id: definition.id,
                // Use the occurrence's placeholder text
                placeholder_text: occurrence.placeholder_text,
              },
            };

            // Find if this occurrence already exists
            const existingIndex = annotations.findIndex(
              (a) => a.id === newAnnotation.id,
            );

            if (existingIndex >= 0) {
              // Replace existing annotation
              annotations[existingIndex] = newAnnotation;
            } else {
              // Add new annotation
              annotations.push(newAnnotation);
            }
          } else {
            // Handle legacy format annotations
            const newAnnotation = {
              id: annotationContent.data?.id || crypto.randomUUID(),
              type: annotationContent.type || 'unknown',
              data: annotationContent.data,
            };

            // Check if annotation already exists by ID
            const existingIndex = annotations.findIndex(
              (a) => a.id === newAnnotation.id,
            );

            if (existingIndex >= 0) {
              // Replace existing annotation
              annotations[existingIndex] = newAnnotation;
            } else {
              // Add new annotation
              annotations.push(newAnnotation);
            }
          }

          return {
            ...metadata,
            annotations,
          };
        });

        // Update artifact status
        setArtifact((draftArtifact) => ({
          ...draftArtifact,
          status: 'streaming',
        }));
      }
    }

    if (streamPart.type === 'text-delta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + (streamPart.content as string),
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView oldContent={oldContent} newContent={newContent} />;
    }

    return (
      <>
        <div className="flex flex-row py-8 md:p-20 px-4">
          <Editor
            content={content}
            suggestions={metadata ? metadata.suggestions : []}
            isCurrentVersion={isCurrentVersion}
            currentVersionIndex={currentVersionIndex}
            status={status}
            onSaveContent={onSaveContent}
            annotations={metadata ? metadata.annotations : []}
          />

          {metadata?.suggestions && metadata.suggestions.length > 0 ? (
            <div className="md:hidden h-dvh w-12 shrink-0" />
          ) : null}
        </div>
      </>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: 'View changes',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('toggle');
      },
      isDisabled: ({ currentVersionIndex, setMetadata }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: 'View Previous version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('prev');
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: 'View Next version',
      onClick: ({ handleVersionChange }) => {
        handleVersionChange('next');
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <PDFIcon size={18} />,
      description: 'Download as PDF',
      onClick: ({ content }) => {
        const pdf = new jsPDF();
        pdf.text(content, 10, 10);
        pdf.save('document.pdf');
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: 'Add final polish',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.',
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: 'Request suggestions',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Please add suggestions you have that could improve the writing.',
        });
      },
    },
    {
      icon: <FormInputIcon size={18} />,
      description: 'Request contract fields',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            'Please add contract fields to the document. Make sure to add fields for each party involved.',
        });
      },
    },
    {
      icon: <ScaleIcon size={18} />,
      description: 'Request legal review',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content:
            "Please add legal review, find any potential issues, and ensure the document is compliant with all relevant laws and regulations. Provide suggestions only, don't modify the document.",
        });
      },
    },
  ],
});
