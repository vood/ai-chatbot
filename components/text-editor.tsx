'use client';

import { exampleSetup } from 'prosemirror-example-setup';
import { inputRules } from 'prosemirror-inputrules';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { GFMExtension } from 'prosemirror-remark';
import { ProseMirrorUnified } from 'prosemirror-unified';
import React, { memo, useEffect, useRef } from 'react';

import type { ContractField, Suggestion } from '@/lib/db/schema';
import {
  documentSchema,
  handleTransaction,
  headingRule,
} from '@/lib/editor/config';
import { createDecorations } from '@/lib/editor/functions';
import {
  projectWithPositions,
  suggestionsPlugin,
  suggestionsPluginKey,
} from '@/lib/editor/suggestions';
import {
  annotationsPlugin,
  annotationsPluginKey,
  createAnnotationDecorations,
} from '@/lib/editor/annotations';
import type { DocumentAnnotation } from '@/components/artifact';
import type { DocumentAnnotationPosition } from '@/lib/ai/tools/request-contract-fields';

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
  annotations?: DocumentAnnotation<ContractField>[];
};

export const pmu = new ProseMirrorUnified([new GFMExtension()]);

// Helper function to find annotation position in text
function findAnnotationPosition(
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

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
  annotations = [],
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: pmu.parse(content),
        plugins: [
          pmu.inputRulesPlugin(),
          pmu.keymapPlugin(),
          ...exampleSetup({ schema: documentSchema, menuBar: false }),
          inputRules({
            rules: [
              headingRule(1),
              headingRule(2),
              headingRule(3),
              headingRule(4),
              headingRule(5),
              headingRule(6),
            ],
          }),
          suggestionsPlugin,
          annotationsPlugin,
        ],
        schema: pmu.schema(),
      });

      editorRef.current = new EditorView(containerRef.current, {
        state,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setProps({
        dispatchTransaction: (transaction) => {
          handleTransaction({
            transaction,
            editorRef,
            onSaveContent,
          });
        },
      });
    }
  }, [onSaveContent]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = pmu.serialize(editorRef.current.state.doc);

      if (status === 'streaming') {
        const newDocument = pmu.parse(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
        return;
      }

      if (currentContent !== content) {
        const newDocument = pmu.parse(content);

        const transaction = editorRef.current.state.tr.replaceWith(
          0,
          editorRef.current.state.doc.content.size,
          newDocument.content,
        );

        transaction.setMeta('no-save', true);
        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  useEffect(() => {
    if (editorRef.current?.state.doc && content) {
      const projectedSuggestions = projectWithPositions(
        editorRef.current.state.doc,
        suggestions,
      ).filter(
        (suggestion) => suggestion.selectionStart && suggestion.selectionEnd,
      );

      const decorations = createDecorations(
        projectedSuggestions,
        editorRef.current,
      );

      const transaction = editorRef.current.state.tr;
      transaction.setMeta(suggestionsPluginKey, { decorations });
      editorRef.current.dispatch(transaction);
    }
  }, [suggestions, content]);

  // Add effect to handle annotations using the dedicated plugin
  useEffect(() => {
    if (editorRef.current?.state.doc && content && annotations.length > 0) {
      // Create decorations for annotations using our specialized function
      const annotationDecorations = createAnnotationDecorations(
        annotations,
        editorRef.current,
        content,
      );

      // Apply the decorations directly to our annotations plugin
      const transaction = editorRef.current.state.tr;
      transaction.setMeta(annotationsPluginKey, {
        decorations: annotationDecorations,
      });

      editorRef.current.dispatch(transaction);
    }
  }, [annotations, content]);

  return (
    <div className="relative prose dark:prose-invert" ref={containerRef} />
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  return (
    prevProps.suggestions === nextProps.suggestions &&
    prevProps.annotations === nextProps.annotations &&
    prevProps.currentVersionIndex === nextProps.currentVersionIndex &&
    prevProps.isCurrentVersion === nextProps.isCurrentVersion &&
    !(prevProps.status === 'streaming' && nextProps.status === 'streaming') &&
    prevProps.content === nextProps.content &&
    prevProps.onSaveContent === nextProps.onSaveContent
  );
}

export const Editor = memo(PureEditor, areEqual);
