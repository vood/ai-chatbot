import type { Node } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { createRoot } from 'react-dom/client';
import React from 'react';

import type { ContractField } from '@/lib/db/schema';
import type { DocumentAnnotation } from '@/components/artifact';
import type { DocumentAnnotationPosition } from '@/lib/ai/tools/request-contract-fields';
// import type { EditorProps } from '@/components/text-editor'; // Import EditorProps if needed for types

// Define a type for annotations with position information
export interface UIAnnotation extends DocumentAnnotation<ContractField> {
  selectionStart?: number;
  selectionEnd?: number;
}

// Helper function to find annotation position in text
export function findAnnotationPosition(
  text: string,
  position: DocumentAnnotationPosition,
): { start: number; end: number } | null {
  try {
    // Check if position has required properties
    if (
      !position ||
      !position.placeholder ||
      !position.prefix ||
      !position.suffix
    ) {
      console.warn('Invalid position data:', position);
      return null;
    }

    // Create a regex pattern that escapes special characters
    const escapeRegExp = (str: string) =>
      str ? str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

    // Normalize text by removing HTML tags
    const normalizeText = (str: string) =>
      str ? str.replace(/<\/?[^>]+(>|$)/g, '') : '';

    // Normalize input text and position components for more accurate matching
    const normalizedText = normalizeText(text);
    const normalizedPrefix = normalizeText(position.prefix);
    const normalizedPlaceholder = normalizeText(position.placeholder);
    const normalizedSuffix = normalizeText(position.suffix);

    // First attempt: try exact pattern with normalized text
    const exactPattern =
      escapeRegExp(normalizedPrefix) +
      escapeRegExp(normalizedPlaceholder) +
      escapeRegExp(normalizedSuffix);

    const exactMatch = new RegExp(exactPattern).exec(normalizedText);
    if (exactMatch) {
      const start = exactMatch.index + normalizedPrefix.length;
      const end = start + normalizedPlaceholder.length;
      return { start, end };
    }

    // Second attempt: try matching just with prefix and placeholder
    const prefixPlaceholderPattern =
      escapeRegExp(normalizedPrefix) + escapeRegExp(normalizedPlaceholder);

    const prefixMatch = new RegExp(prefixPlaceholderPattern).exec(
      normalizedText,
    );
    if (prefixMatch) {
      const start = prefixMatch.index + normalizedPrefix.length;
      const end = start + normalizedPlaceholder.length;
      return { start, end };
    }

    // Last resort: try to find just the placeholder
    const placeholderMatch = new RegExp(
      escapeRegExp(normalizedPlaceholder),
    ).exec(normalizedText);

    if (placeholderMatch) {
      return {
        start: placeholderMatch.index,
        end: placeholderMatch.index + normalizedPlaceholder.length,
      };
    }

    // If we still can't find it, try with original (non-normalized) placeholder as a last resort
    const originalPlaceholderMatch = new RegExp(
      escapeRegExp(position.placeholder),
    ).exec(text);

    if (originalPlaceholderMatch) {
      return {
        start: originalPlaceholderMatch.index,
        end: originalPlaceholderMatch.index + position.placeholder.length,
      };
    }

    console.warn(
      'Could not find position for placeholder:',
      position.placeholder,
    );
    return null;
  } catch (error) {
    console.error('Error finding annotation position:', error);
    return null;
  }
}

// Helper function to find positions in document similar to suggestion.tsx approach
function findPlaceholderInDoc(
  doc: Node,
  placeholder: string,
  context?: { prefix?: string; suffix?: string },
): { start: number; end: number } | null {
  let positions: { start: number; end: number } | null = null;

  // Normalize text by removing HTML tags for matching
  const normalizeText = (str: string) =>
    str ? str.replace(/<\/?[^>]+(>|$)/g, '') : '';

  const normalizedPlaceholder = normalizeText(placeholder);
  const normalizedPrefix = context?.prefix ? normalizeText(context.prefix) : '';
  const normalizedSuffix = context?.suffix ? normalizeText(context.suffix) : '';

  // Collect all text from the document to handle crossing node boundaries
  let docText = '';
  const nodePositions: { pos: number; text: string; length: number }[] = [];

  // First pass: collect all text and positions
  doc.nodesBetween(0, doc.content.size, (node, pos) => {
    if (node.isText && node.text) {
      const nodeText = normalizeText(node.text);
      nodePositions.push({
        pos,
        text: nodeText,
        length: nodeText.length,
      });
      docText += nodeText;
    }
    return true;
  });

  // If we have context, try to match with prefix and suffix
  if (normalizedPrefix && normalizedSuffix) {
    const pattern = normalizedPrefix + normalizedPlaceholder + normalizedSuffix;
    const index = docText.indexOf(pattern);

    if (index !== -1) {
      // Found a match with context
      const start = index + normalizedPrefix.length;
      const end = start + normalizedPlaceholder.length;

      // Map these positions back to ProseMirror positions
      positions = mapTextPositionsToProseMirror(start, end, nodePositions);
      return positions;
    }
  }

  // Try just with prefix + placeholder
  if (normalizedPrefix) {
    const pattern = normalizedPrefix + normalizedPlaceholder;
    const index = docText.indexOf(pattern);

    if (index !== -1) {
      // Found a match with prefix
      const start = index + normalizedPrefix.length;
      const end = start + normalizedPlaceholder.length;

      // Map these positions back to ProseMirror positions
      positions = mapTextPositionsToProseMirror(start, end, nodePositions);
      return positions;
    }
  }

  // Direct placeholder matching as fallback
  const index = docText.indexOf(normalizedPlaceholder);
  if (index !== -1) {
    const start = index;
    const end = start + normalizedPlaceholder.length;

    // Map these positions back to ProseMirror positions
    positions = mapTextPositionsToProseMirror(start, end, nodePositions);
    return positions;
  }

  return null;
}

// Helper to map plain text positions to ProseMirror document positions
function mapTextPositionsToProseMirror(
  start: number,
  end: number,
  nodePositions: { pos: number; text: string; length: number }[],
): { start: number; end: number } | null {
  let startPos = -1;
  let endPos = -1;
  let currentTextPos = 0;

  for (const node of nodePositions) {
    const nodeEndPos = currentTextPos + node.length;

    // Check if start position is in this node
    if (startPos === -1 && start >= currentTextPos && start < nodeEndPos) {
      const offset = start - currentTextPos;
      startPos = node.pos + offset;
    }

    // Check if end position is in this node
    if (endPos === -1 && end >= currentTextPos && end <= nodeEndPos) {
      const offset = end - currentTextPos;
      endPos = node.pos + offset;
    }

    // If both positions found, we're done
    if (startPos !== -1 && endPos !== -1) {
      break;
    }

    currentTextPos += node.length;
  }

  if (startPos !== -1 && endPos !== -1) {
    return { start: startPos, end: endPos };
  }

  return null;
}

// Helper function to project annotations with their positions in the document
export function projectAnnotationsWithPositions(
  doc: Node,
  content: string,
  annotations: Array<DocumentAnnotation<ContractField>>,
): Array<UIAnnotation> {
  // Add null/undefined check for annotations
  if (!annotations) {
    return [];
  }
  return annotations.map((annotation) => {
    if (
      annotation.type !== 'contractField' ||
      !annotation.data?.position_in_document
    ) {
      return {
        ...annotation,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    }

    const positionData = annotation.data.position_in_document;

    // Handle different position_in_document formats
    let position: DocumentAnnotationPosition;

    if (positionData.type === 'annotation' && positionData.position) {
      // New format where position is nested
      position = positionData.position;
    } else {
      // Try to use position_in_document directly (backward compatibility)
      position = positionData as unknown as DocumentAnnotationPosition;
    }

    // Skip if position data is invalid
    if (!position || !position.placeholder) {
      console.warn('Invalid position data for annotation:', annotation.id);
      return {
        ...annotation,
        selectionStart: undefined,
        selectionEnd: undefined,
      };
    }

    // Use document traversal to find positions with context
    const positions = findPlaceholderInDoc(doc, position.placeholder, {
      prefix: position.prefix,
      suffix: position.suffix,
    });

    if (!positions) {
      // Fallback to regex if doc traversal fails or content is simpler
      const regexPositions = findAnnotationPosition(content, position);

      if (!regexPositions) {
        console.warn(
          'Could not find position for placeholder (both methods):',
          position.placeholder,
        );
        return {
          ...annotation,
          selectionStart: undefined,
          selectionEnd: undefined,
        };
      }
      // Use regex positions ONLY if document traversal fails
      // NOTE: Regex positions are relative to plain text, not Prosemirror doc,
      // mapping them back accurately can be complex. Prioritize doc traversal.
      // For simplicity here, we'll return undefined if doc traversal fails.
      // A more robust solution would map regex positions back to Prosemirror positions.
      console.warn(
        'Document traversal failed for placeholder, returning undefined positions:',
        position.placeholder,
      );
      return {
        ...annotation,
        selectionStart: undefined, // Mark as not found in doc
        selectionEnd: undefined,
      };
    }

    return {
      ...annotation,
      selectionStart: positions.start,
      selectionEnd: positions.end,
    };
  });
}

// Create a dedicated plugin for annotations
export const annotationsPluginKey = new PluginKey<AnnotationPluginState>(
  'annotations',
);

// Define the state shape for the plugin
interface AnnotationPluginState {
  projectedAnnotations: UIAnnotation[];
  selectedAnnotationId: string | null;
  // We don't store decorations directly in state anymore, they are derived
}

// Helper function to get a consistent color based on contact_id
function getContactColor(contactId: string): { bg: string; border: string } {
  // Predefined pleasant colors for fields - we'll select one based on contactId
  const colors = [
    { bg: 'rgba(25, 118, 210, 0.2)', border: 'rgba(25, 118, 210, 0.5)' }, // blue
    { bg: 'rgba(76, 175, 80, 0.2)', border: 'rgba(76, 175, 80, 0.5)' }, // green
    { bg: 'rgba(245, 124, 0, 0.2)', border: 'rgba(245, 124, 0, 0.5)' }, // orange
    { bg: 'rgba(156, 39, 176, 0.2)', border: 'rgba(156, 39, 176, 0.5)' }, // purple
    { bg: 'rgba(233, 30, 99, 0.2)', border: 'rgba(233, 30, 99, 0.5)' }, // pink
    { bg: 'rgba(0, 150, 136, 0.2)', border: 'rgba(0, 150, 136, 0.5)' }, // teal
    { bg: 'rgba(211, 47, 47, 0.2)', border: 'rgba(211, 47, 47, 0.5)' }, // red
    { bg: 'rgba(33, 150, 243, 0.2)', border: 'rgba(33, 150, 243, 0.5)' }, // light blue
    { bg: 'rgba(103, 58, 183, 0.2)', border: 'rgba(103, 58, 183, 0.5)' }, // deep purple
    { bg: 'rgba(255, 152, 0, 0.2)', border: 'rgba(255, 152, 0, 0.5)' }, // amber
  ];

  // Use the contact_id string to deterministically select a color
  // This ensures the same contact always gets the same color
  const hash = (contactId || '') // Handle potential null/undefined contactId
    .split('')
    .reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export const annotationsPlugin = new Plugin({
  key: annotationsPluginKey,
  state: {
    init(_, instance): AnnotationPluginState {
      // Initialize with empty annotations and no selection
      return { projectedAnnotations: [], selectedAnnotationId: null };
    },
    apply(tr, state, oldState, newState): AnnotationPluginState {
      // Check if new annotations are being passed in meta
      const newAnnotations = tr.getMeta('setAnnotations');
      if (newAnnotations) {
        const doc = tr.doc || newState.doc; // Use transaction doc if available
        const content = doc.textContent; // Or serialize the doc if needed
        // Ensure newAnnotations is an array before projecting
        const annotationsArray = Array.isArray(newAnnotations)
          ? newAnnotations
          : [];
        const projected = projectAnnotationsWithPositions(
          doc,
          content,
          annotationsArray,
        );
        // Keep selected if it still exists, otherwise clear
        const selectedStillExists = projected.some(
          (a) => a.id === state.selectedAnnotationId,
        );
        return {
          projectedAnnotations: projected,
          selectedAnnotationId: selectedStillExists
            ? state.selectedAnnotationId
            : null,
        };
      }

      // Check if a selection change is being passed in meta
      const selectionChange = tr.getMeta('setSelectedAnnotation');
      if (selectionChange !== undefined) {
        // selectionChange contains the ID or null
        return {
          ...state,
          selectedAnnotationId: selectionChange,
        };
      }

      // If the document changed, we need to remap annotations and potentially re-project
      // For simplicity now, we just map the existing state. A full re-projection might be needed
      // if content changes significantly affect calculated positions.
      if (tr.docChanged) {
        // Simple mapping - positions might become inaccurate if edits happen *within* annotations
        const mappedAnnotations = state.projectedAnnotations
          .map((anno) => {
            if (
              anno.selectionStart === undefined ||
              anno.selectionEnd === undefined
            )
              return anno;
            const from = tr.mapping.map(anno.selectionStart);
            const to = tr.mapping.map(anno.selectionEnd);
            // Basic check if mapping deleted the range
            if (from >= to) {
              return {
                ...anno,
                selectionStart: undefined,
                selectionEnd: undefined,
              };
            }
            return { ...anno, selectionStart: from, selectionEnd: to };
          })
          .filter((a) => a.selectionStart !== undefined); // Remove annotations whose range was deleted

        // Check if selected annotation still exists after mapping
        const selectedStillExists = mappedAnnotations.some(
          (a) => a.id === state.selectedAnnotationId,
        );

        return {
          projectedAnnotations: mappedAnnotations,
          selectedAnnotationId: selectedStillExists
            ? state.selectedAnnotationId
            : null,
        };
      }

      // Otherwise, return the state unchanged
      return state;
    },
  },
  props: {
    decorations(state) {
      const pluginState = annotationsPluginKey.getState(state);
      if (!pluginState) return DecorationSet.empty;

      const { projectedAnnotations, selectedAnnotationId } = pluginState;
      const decorations: Decoration[] = [];
      const contactColorMap = new Map<string, { bg: string; border: string }>();

      for (const annotation of projectedAnnotations) {
        if (
          annotation.type !== 'contractField' ||
          annotation.selectionStart === undefined || // Check for undefined explicitly
          annotation.selectionEnd === undefined ||
          !annotation.data
        )
          continue;

        const { selectionStart, selectionEnd } = annotation;
        const contactId = annotation.data.contact_id || 'unknown'; // Handle missing contact_id

        // Get or create a color for this contact
        let contactColor = contactColorMap.get(contactId);
        if (!contactColor) {
          contactColor = getContactColor(contactId);
          contactColorMap.set(contactId, contactColor);
        }

        const fieldType = (
          annotation.data.field_type || 'unknown'
        ).toLowerCase();
        const isSelected = selectedAnnotationId === annotation.id;

        // Create inline decoration
        const decoration = Decoration.inline(
          selectionStart,
          selectionEnd,
          {
            class: `annotation contract-field-${fieldType} contact-${contactId.substring(0, 8)} ${isSelected ? 'selected' : ''}`,
            style: `
              background-color: ${contactColor.bg};
              border: 1px solid ${contactColor.border};
              border-radius: 3px;
              padding: 0.5px 2px; /* Minimal padding */
              margin: 0 1px; /* Minimal margin */
              cursor: pointer;
              transition: all 0.1s ease-in-out;
              ${isSelected ? `box-shadow: 0 0 0 2px ${contactColor.border}; outline: 1px solid ${contactColor.border};` : ''}
            `,
            'data-annotation-id': annotation.id,
            title: `${annotation.data.field_name || 'Field'} (${annotation.data.field_type || 'unknown'}) - Click to view details`,
          },
          {
            // Pass annotation id for click handling
            id: annotation.id,
            type: 'contractField',
          },
        );
        decorations.push(decoration);
      }

      return DecorationSet.create(state.doc, decorations);
    },
    // Handle click events on annotations
    handleClick(view, pos, event) {
      const state = view.state;
      const pluginState = annotationsPluginKey.getState(state);
      if (!pluginState) return false;

      const { projectedAnnotations, selectedAnnotationId } = pluginState;
      let clickedAnnotation: UIAnnotation | null = null;

      // Find if the click position falls within any annotation range
      for (const annotation of projectedAnnotations) {
        if (
          annotation.selectionStart !== undefined &&
          annotation.selectionEnd !== undefined &&
          pos >= annotation.selectionStart &&
          pos <= annotation.selectionEnd
        ) {
          clickedAnnotation = annotation;
          break;
        }
      }

      // Get the callback from props
      const onAnnotationSelect = (view.props as any).onAnnotationSelect as (
        annotation: UIAnnotation | null,
      ) => void;

      let newSelectedId: string | null = null;

      if (clickedAnnotation) {
        // If clicking the already selected annotation, deselect it. Otherwise, select the new one.
        newSelectedId =
          selectedAnnotationId === clickedAnnotation.id
            ? null
            : clickedAnnotation.id;
      } else {
        // Clicked outside any annotation, deselect
        newSelectedId = null;
      }

      // Call the external callback only if the selection changed or an annotation was clicked
      if (newSelectedId !== selectedAnnotationId || clickedAnnotation) {
        if (onAnnotationSelect) {
          // Pass the full annotation object if selected, otherwise null
          onAnnotationSelect(newSelectedId ? clickedAnnotation : null);
        } else {
          console.warn('onAnnotationSelect prop not provided to EditorView');
        }
      }

      // Dispatch transaction to update internal plugin state if selection changed
      if (newSelectedId !== selectedAnnotationId) {
        view.dispatch(
          view.state.tr.setMeta('setSelectedAnnotation', newSelectedId),
        );
        // Prevent default browser behavior only if we handled the click
        event.preventDefault();
        return true;
      }

      // If click was outside and nothing was selected, let the default behavior proceed.
      // If click was on the selected annotation to deselect it, we already returned true.
      // If click was on a non-selected annotation to select it, we already returned true.
      return clickedAnnotation !== null; // Return true if click was on *any* annotation
    },
  },
});
