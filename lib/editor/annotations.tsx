import type { Node } from 'prosemirror-model';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet, type EditorView } from 'prosemirror-view';
import { createRoot } from 'react-dom/client';
import React from 'react';

import type { ContractField } from '@/lib/db/schema';
import type { DocumentAnnotation } from '@/components/artifact';
import type { DocumentAnnotationPosition } from '@/lib/ai/tools/request-contract-fields';

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
      // If document traversal fails, fall back to using the regex method
      console.log('Document traversal failed, trying regex fallback');
      const regexPositions = findAnnotationPosition(content, position);

      if (!regexPositions) {
        console.warn(
          'Could not find position for placeholder:',
          position.placeholder,
        );
        return {
          ...annotation,
          selectionStart: undefined,
          selectionEnd: undefined,
        };
      }

      return {
        ...annotation,
        selectionStart: regexPositions.start,
        selectionEnd: regexPositions.end,
      };
    }

    return {
      ...annotation,
      selectionStart: positions.start,
      selectionEnd: positions.end,
    };
  });
}

// React component for annotation widget
export const AnnotationWidget: React.FC<{
  annotation: UIAnnotation;
  onEdit?: () => void;
}> = ({ annotation, onEdit }) => {
  if (!annotation.data) return null;

  const fieldType = annotation.data.field_type || 'unknown';
  const fieldName = annotation.data.field_name || 'Field';

  return (
    <div className="annotation-widget">
      <div className="annotation-info">
        <span className="field-type">{fieldType}</span>
        <span className="field-name">{fieldName}</span>
      </div>
      {onEdit && (
        <button type="button" className="edit-button" onClick={onEdit}>
          Edit
        </button>
      )}
      <style jsx>{`
        .annotation-widget {
          position: absolute;
          display: flex;
          padding: 4px 8px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          z-index: 10;
          margin-top: 4px;
        }
        .annotation-info {
          display: flex;
          flex-direction: column;
          margin-right: 8px;
        }
        .field-type {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
        }
        .field-name {
          font-weight: bold;
        }
        .edit-button {
          background: #f0f0f0;
          border: none;
          border-radius: 2px;
          padding: 2px 6px;
          font-size: 12px;
          cursor: pointer;
        }
        .edit-button:hover {
          background: #e0e0e0;
        }
      `}</style>
    </div>
  );
};

// Function to create annotation decoration
export function createAnnotationWidget(
  annotation: UIAnnotation,
  view: EditorView,
): { dom: HTMLElement; destroy: () => void } {
  const dom = document.createElement('span');
  const root = createRoot(dom);

  dom.addEventListener('mousedown', (event) => {
    event.preventDefault();
    view.dom.blur();
  });

  const onEdit = () => {
    // TODO: Implement editing functionality
    console.log('Edit annotation:', annotation);
  };

  root.render(<AnnotationWidget annotation={annotation} onEdit={onEdit} />);

  return {
    dom,
    destroy: () => {
      // Wrapping unmount in setTimeout to avoid synchronous unmounting during render
      setTimeout(() => {
        root.unmount();
      }, 0);
    },
  };
}

// Create a dedicated plugin for annotations
export const annotationsPluginKey = new PluginKey('annotations');
export const annotationsPlugin = new Plugin({
  key: annotationsPluginKey,
  state: {
    init() {
      return { decorations: DecorationSet.empty, selected: null };
    },
    apply(tr, state) {
      const newDecorations = tr.getMeta(annotationsPluginKey);
      if (newDecorations) return newDecorations;

      // If there's a selection operation, update the selected field
      const selectedField = tr.getMeta('selectedField');
      if (selectedField !== undefined) {
        return {
          ...state,
          selected: selectedField,
        };
      }

      return {
        decorations: state.decorations.map(tr.mapping, tr.doc),
        selected: state.selected,
      };
    },
  },
  props: {
    decorations(state) {
      return this.getState(state)?.decorations ?? DecorationSet.empty;
    },
    // Handle click events on annotations
    handleClick(view, pos, event) {
      // Find the decoration at the clicked position
      const state = view.state;
      const decorations = annotationsPluginKey.getState(state)?.decorations;

      if (!decorations) return false;

      const found = decorations.find(pos, pos);

      if (found.length > 0) {
        const decoration = found[0];
        const annotationId = decoration.spec.id;

        // Toggle the selected state
        const currentSelected = annotationsPluginKey.getState(state)?.selected;
        const newSelected =
          currentSelected === annotationId ? null : annotationId;

        view.dispatch(view.state.tr.setMeta('selectedField', newSelected));
        return true;
      }

      // Click wasn't on an annotation
      return false;
    },
  },
});

// Field Details component
export const FieldDetails: React.FC<{
  annotation: UIAnnotation;
  onClose: () => void;
  onEdit?: () => void;
}> = ({ annotation, onClose, onEdit }) => {
  if (!annotation?.data) return null;

  const data = annotation.data;

  // Try to extract field_definition_id if it exists
  const fieldDefinitionId =
    'field_definition_id' in data ? (data as any).field_definition_id : null;

  return (
    <div className="field-details-popup">
      <div className="field-details-header">
        <h4 className="field-name">{data.field_name}</h4>
        <button type="button" className="close-button" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="field-details-content">
        <div className="field-detail-row">
          <span className="field-label">Type:</span>
          <span className="field-value">{data.field_type}</span>
        </div>

        <div className="field-detail-row">
          <span className="field-label">Required:</span>
          <span className="field-value">{data.is_required ? 'Yes' : 'No'}</span>
        </div>

        {fieldDefinitionId && (
          <div className="field-detail-row">
            <span className="field-label">Definition ID:</span>
            <span className="field-value field-id">{fieldDefinitionId}</span>
          </div>
        )}

        <div className="field-detail-row">
          <span className="field-label">Placeholder:</span>
          <span className="field-value field-placeholder">
            {data.placeholder_text}
          </span>
        </div>

        <div className="field-detail-row">
          <span className="field-label">Status:</span>
          <span className="field-value">
            {data.is_filled ? 'Filled' : 'Not filled'}
          </span>
        </div>

        {data.field_value && (
          <div className="field-detail-row">
            <span className="field-label">Value:</span>
            <span className="field-value">{data.field_value}</span>
          </div>
        )}
      </div>

      <div className="field-details-actions">
        {onEdit && (
          <button type="button" className="edit-button" onClick={onEdit}>
            Edit Field
          </button>
        )}
      </div>

      <style jsx>{`
        .field-details-popup {
          position: absolute;
          background: white;
          border: 1px solid #ccc;
          border-radius: 6px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          width: 300px;
          z-index: 50;
          font-family: system-ui, sans-serif;
          color: #333;
          font-size: 14px;
          overflow: hidden;
        }
        
        .field-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #eee;
        }
        
        .field-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        
        .close-button {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #666;
          padding: 0 4px;
          line-height: 1;
        }
        
        .field-details-content {
          padding: 12px 16px;
        }
        
        .field-detail-row {
          display: flex;
          margin-bottom: 8px;
        }
        
        .field-label {
          width: 90px;
          font-weight: 500;
          color: #666;
        }
        
        .field-value {
          flex: 1;
        }
        
        .field-id, .field-placeholder {
          font-family: monospace;
          font-size: 12px;
          background: #f5f5f5;
          padding: 2px 4px;
          border-radius: 3px;
          word-break: break-all;
        }
        
        .field-details-actions {
          display: flex;
          justify-content: flex-end;
          padding: 12px 16px;
          background: #f8f9fa;
          border-top: 1px solid #eee;
        }
        
        .edit-button {
          background: #0078d4;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          font-size: 14px;
          cursor: pointer;
        }
        
        .edit-button:hover {
          background: #106ebe;
        }
      `}</style>
    </div>
  );
};

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
  const hash = contactId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Helper function to create annotation decorations
export function createAnnotationDecorations(
  annotations: DocumentAnnotation<ContractField>[],
  editorView: EditorView,
  content: string,
): DecorationSet {
  if (!annotations || annotations.length === 0) return DecorationSet.empty;

  const doc = editorView.state.doc;
  const decorations: Decoration[] = [];
  const fieldDetailsDecorations: Decoration[] = [];

  // Track colors by contact_id
  const contactColorMap = new Map<string, { bg: string; border: string }>();

  // Get the currently selected field
  const selectedField = annotationsPluginKey.getState(
    editorView.state,
  )?.selected;

  // Project annotations with positions
  const projectedAnnotations = projectAnnotationsWithPositions(
    doc,
    content,
    annotations,
  );

  for (const annotation of projectedAnnotations) {
    if (
      annotation.type !== 'contractField' ||
      !annotation.selectionStart ||
      !annotation.selectionEnd ||
      !annotation.data
    )
      continue;

    const { selectionStart, selectionEnd } = annotation;
    const contactId = annotation.data.contact_id;

    // Get or create a color for this contact
    let contactColor = contactColorMap.get(contactId);
    if (!contactColor) {
      contactColor = getContactColor(contactId);
      contactColorMap.set(contactId, contactColor);
    }

    // Create field decoration with contact-specific color
    const fieldType = (annotation.data.field_type || 'unknown').toLowerCase();
    const isSelected = selectedField === annotation.id;

    // Enhance the styling with contact-specific color and selection state
    const decoration = Decoration.inline(
      selectionStart,
      selectionEnd,
      {
        class: `annotation contract-field-${fieldType} contact-${contactId.substring(0, 8)}`,
        style: `
          background-color: ${contactColor.bg}; 
          border: 1px solid ${contactColor.border};
          border-radius: 2px; 
          cursor: pointer;
          ${isSelected ? `box-shadow: 0 0 0 2px ${contactColor.border};` : ''}
        `,
        'data-annotation-id': annotation.id,
        'data-annotation-type': annotation.type,
        'data-field-type': fieldType,
        'data-contact-id': contactId,
        title: `${annotation.data.field_name || 'Field'} (${annotation.data.field_type || 'unknown'})`,
      },
      {
        id: annotation.id,
        type: 'contractField',
      },
    );

    decorations.push(decoration);

    // If this field is selected, create a widget decoration for the field details
    if (selectedField === annotation.id) {
      const fieldDetailsWidget = Decoration.widget(
        selectionEnd,
        (view) => {
          const dom = document.createElement('div');
          const root = createRoot(dom);

          const handleClose = () => {
            view.dispatch(view.state.tr.setMeta('selectedField', null));
          };

          const handleEdit = () => {
            console.log('Edit field:', annotation);
            // TODO: Implement edit functionality
          };

          root.render(
            <FieldDetails
              annotation={annotation}
              onClose={handleClose}
              onEdit={handleEdit}
            />,
          );

          return dom;
        },
        {
          id: `details-${annotation.id}`,
          key: `field-details-${annotation.id}`,
          side: 1,
        },
      );

      fieldDetailsDecorations.push(fieldDetailsWidget);
    }
  }

  return DecorationSet.create(editorView.state.doc, [
    ...decorations,
    ...fieldDetailsDecorations,
  ]);
}
