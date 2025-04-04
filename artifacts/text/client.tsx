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
import { useState } from 'react';
import type { UIAnnotation } from '@/lib/editor/annotations';
import { FieldDetailsEditor } from '@/components/field-details-editor';
import type { ContractField } from '@/lib/db/schema';
// Import Sheet components
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

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

    console.log(
      'Initializing text artifact, fetched contractFields:',
      contractFields,
    );

    // Create annotations for each field occurrence
    const annotations: Array<DocumentAnnotation<any>> = [];

    // Ensure contractFields is an array
    if (Array.isArray(contractFields)) {
      contractFields.forEach((field) => {
        // Check if the field has multiple occurrences
        if (field.position_in_document?.occurrences?.length) {
          // Create an annotation for each occurrence
          field.position_in_document.occurrences.forEach(
            (occurrence: any, index: number) => {
              annotations.push({
                id: occurrence.id || `${field.id}-${index}`, // Ensure unique ID
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
                  contact_id: field.contact_id, // Ensure contact_id is included
                },
              });
            },
          );
        } else {
          // Fallback for single occurrence or old format
          annotations.push({
            id: field.id,
            type: 'contractField',
            data: field, // Include contact_id if available at top level
          });
        }
      });
    } else {
      console.error('contractFields is not an array:', contractFields);
    }

    console.log('Created annotations:', annotations);

    setMetadata({
      suggestions: Array.isArray(suggestions) ? suggestions : [], // Ensure suggestions is array
      annotations,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === 'suggestion') {
      const suggestion = streamPart.content as Suggestion;
      // Basic validation using optional chaining
      if (suggestion?.id) {
        setMetadata((metadata) => ({
          ...metadata,
          // Use nullish coalescing for potentially null suggestions array
          suggestions: [...(metadata?.suggestions ?? []), suggestion],
        }));
      }
    }

    // Handle document annotations
    if (streamPart.type === 'annotation') {
      const annotationContent =
        streamPart.content as DocumentAnnotationStreamContent;

      if (
        annotationContent &&
        typeof annotationContent === 'object' &&
        annotationContent.type &&
        annotationContent.data
      ) {
        setMetadata((metadata) => {
          // Use nullish coalescing for potentially null annotations array
          const annotations = [...(metadata?.annotations ?? [])];
          let newOrUpdatedAnnotation: DocumentAnnotation<any> | null = null;

          // Handle contract field annotations with multiple occurrences (new format)
          if (
            annotationContent.type === 'contractField' &&
            annotationContent.data?.definition &&
            annotationContent.data?.occurrence
          ) {
            const { definition, occurrence } = annotationContent.data;
            // Ensure required fields exist
            if (definition && occurrence && occurrence.id && definition.id) {
              newOrUpdatedAnnotation = {
                id: occurrence.id, // Use the specific occurrence ID
                type: 'contractField',
                data: {
                  ...definition,
                  position_in_document: {
                    type: 'annotation',
                    position: occurrence.position,
                  },
                  field_definition_id: definition.id,
                  placeholder_text: occurrence.placeholder_text,
                  contact_id: definition.contact_id, // Get contact_id from definition
                },
              };
            }
          } else {
            // Handle legacy/simpler format annotations
            const annotationId =
              annotationContent.data?.id || crypto.randomUUID();
            newOrUpdatedAnnotation = {
              id: annotationId,
              type: annotationContent.type,
              data: annotationContent.data,
            };
          }

          // Add or update the annotation in the list
          if (newOrUpdatedAnnotation) {
            const existingIndex = annotations.findIndex(
              (a) => a.id === newOrUpdatedAnnotation!.id,
            );
            if (existingIndex >= 0) {
              annotations[existingIndex] = newOrUpdatedAnnotation;
            } else {
              annotations.push(newOrUpdatedAnnotation);
            }
            console.log('Updated annotations metadata:', annotations);
            return {
              ...metadata,
              annotations, // Return the modified annotations array
            };
          } else {
            console.warn(
              'Failed to create/update annotation from stream part:',
              streamPart,
            );
            // Return potentially updated metadata but without the failed annotation change
            return { ...metadata, annotations };
          }
        });

        // Update artifact status (consider if needed for annotations)
        // setArtifact((draftArtifact) => ({
        //   ...draftArtifact,
        //   status: 'streaming',
        // }));
      } else {
        console.warn(
          'Invalid annotation stream part content:',
          annotationContent,
        );
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
    setMetadata,
  }) => {
    // Add state for the selected annotation
    const [selectedAnnotation, setSelectedAnnotation] =
      useState<UIAnnotation | null>(null);

    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === 'diff') {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView oldContent={oldContent} newContent={newContent} />;
    }

    // Ensure metadata and annotations exist before passing
    const currentAnnotations = metadata?.annotations || [];
    const currentSuggestions = metadata?.suggestions || [];

    // Handler for closing the sheet (clears selection)
    const handleSheetClose = (isOpen: boolean) => {
      if (!isOpen) {
        setSelectedAnnotation(null);
      }
    };

    // Placeholder save handler - TODO: Implement backend update
    const handleSaveAnnotation = (
      annotationId: string,
      updatedData: Partial<ContractField>,
    ) => {
      console.log('Saving annotation:', annotationId, updatedData);
      // TODO: Call API to save changes

      // OPTIONAL: Update local metadata state immediately for better UX
      // Requires setMetadata to be passed down or handled via context/hook
      if (setMetadata) {
        setMetadata((currentMetadata) => {
          if (!currentMetadata?.annotations) return currentMetadata;

          const updatedAnnotations = currentMetadata.annotations.map((anno) => {
            if (anno.id === annotationId) {
              return {
                ...anno,
                data: {
                  ...anno.data,
                  ...updatedData,
                  contact_id: updatedData.contact_id,
                },
              };
            }
            return anno;
          });

          return {
            ...currentMetadata,
            annotations: updatedAnnotations,
          };
        });
      } else {
        console.warn(
          'setMetadata prop not available to update annotations locally.',
        );
      }

      // Optionally close the sheet after saving
      // setSelectedAnnotation(null);
    };

    return (
      <div className="flex flex-row py-8 md:p-20 px-4">
        <Editor
          content={content}
          suggestions={currentSuggestions}
          isCurrentVersion={isCurrentVersion}
          currentVersionIndex={currentVersionIndex}
          status={status}
          onSaveContent={onSaveContent}
          annotations={currentAnnotations}
          onAnnotationSelect={setSelectedAnnotation}
        />
        {metadata?.suggestions && metadata.suggestions.length > 0 ? (
          <div className="md:hidden h-dvh w-12 shrink-0" />
        ) : null}
        <Sheet
          open={selectedAnnotation !== null}
          onOpenChange={handleSheetClose}
        >
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Edit Field</SheetTitle>
            </SheetHeader>
            <div className="py-4">
              <FieldDetailsEditor
                annotation={selectedAnnotation}
                onSave={handleSaveAnnotation}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
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
