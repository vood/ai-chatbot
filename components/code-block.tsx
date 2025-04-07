'use client';

import React from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python'; // Example language
import { basicSetup } from 'codemirror'; // Import basicSetup
import { useEffect, useRef } from 'react';

interface CodeBlockProps {
  node: any;
  inline: boolean;
  className?: string;
  children: React.ReactNode; // Use React.ReactNode for children prop type
}

// Helper function to extract text content from React children
function getTextFromChildren(children: React.ReactNode): string {
  let text = '';
  React.Children.forEach(children, (child) => {
    if (typeof child === 'string' || typeof child === 'number') {
      text += child;
    } else if (React.isValidElement(child)) {
      // Recursively process the children of the element
      if (child.props.children) {
        text += getTextFromChildren(child.props.children);
      }
    }
    // Implicitly handles arrays, null, undefined, boolean from React.Children.forEach
  });
  return text;
}

export function CodeBlock({
  node,
  inline,
  className,
  children,
  ...props
}: CodeBlockProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  // Use the helper function to extract text content
  const codeContent = getTextFromChildren(children);
  // Trim the extracted code content before using it
  const code = codeContent.trim();

  useEffect(() => {
    // Only run for non-inline blocks
    // Ensure code is not empty after trimming before initializing
    if (!inline && editorRef.current && !viewRef.current && code) {
      // Attempt to detect language from className (e.g., "language-python")
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : null;

      // Determine the language extension based on the detected language
      const languageExtension = (() => {
        if (language === 'python') {
          return [python()];
        }
        // Add more languages here as needed
        return []; // Default to no language extension
      })();

      const startState = EditorState.create({
        doc: code, // Use the extracted and trimmed code string
        extensions: [
          basicSetup, // Add basicSetup
          oneDark,
          ...languageExtension, // Use the determined extension
          EditorView.lineWrapping,
          EditorView.editable.of(false), // Make it read-only
        ],
      });

      try {
        viewRef.current = new EditorView({
          state: startState,
          parent: editorRef.current,
        });
      } catch (error) {
        console.error('CodeBlock useEffect: Error creating EditorView:', error);
      }
    }
    // Cleanup function to destroy the view when the component unmounts or deps change
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, [inline, className, code]);

  if (!inline) {
    // Use the ref div for CodeMirror to attach to
    return (
      <div
        className="not-prose text-sm w-full overflow-x-auto dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl cm-editor-container"
        ref={editorRef}
        {...props} // Pass remaining props to the container
      />
    );
  } else {
    // For inline code, render the original children directly
    return (
      <code
        className={`${className} text-sm bg-zinc-100 dark:bg-zinc-800 inline-block py-0.5 px-1 rounded-md`}
        {...props}
      >
        {children}
      </code>
    );
  }
}
