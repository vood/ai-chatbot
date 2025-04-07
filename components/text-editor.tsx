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
import { annotationsPlugin, type UIAnnotation } from '@/lib/editor/annotations';
import type { DocumentAnnotation } from '@/components/artifact';

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
  annotations?: DocumentAnnotation<ContractField>[];
  onAnnotationSelect?: (annotation: UIAnnotation | null) => void;
};

function PureEditor({
  content,
  onSaveContent,
  suggestions,
  status,
  annotations = [],
  onAnnotationSelect,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);

  const pmu = new ProseMirrorUnified([new GFMExtension()]);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const state = EditorState.create({
        doc: content ? pmu.parse(content) : pmu.parse(''),
        plugins: [
          pmu.inputRulesPlugin(),
          pmu.keymapPlugin(),
          ...exampleSetup({ schema: pmu.schema(), menuBar: false }),
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
        ...(onAnnotationSelect && { onAnnotationSelect }),
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
        ...(onAnnotationSelect && { onAnnotationSelect }),
      });
    }
  }, [onSaveContent, onAnnotationSelect]);

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
    if (editorRef.current?.state) {
      const transaction = editorRef.current.state.tr.setMeta(
        'setAnnotations',
        annotations,
      );
      editorRef.current.dispatch(transaction);
    }
  }, [annotations]);

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
    prevProps.onSaveContent === nextProps.onSaveContent &&
    prevProps.onAnnotationSelect === nextProps.onAnnotationSelect
  );
}

export const Editor = memo(PureEditor, areEqual);
