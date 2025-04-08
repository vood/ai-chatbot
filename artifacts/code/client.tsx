import {
  Artifact,
  type ArtifactAction,
  type ArtifactActionContext,
} from '@/components/create-artifact';
import { CodeEditor } from '@/components/code-editor';
import {
  CopyIcon,
  EyeIcon,
  LogsIcon,
  MessageIcon,
  PlayIcon,
  RedoIcon,
  UndoIcon,
  CodeIcon,
} from '@/components/icons';
import { toast } from 'sonner';
import { generateUUID } from '@/lib/utils';
import {
  Console,
  type ConsoleOutput,
  type ConsoleOutputContent,
} from '@/components/console';
import { CodePreview } from '@/components/code-preview';

const OUTPUT_HANDLERS = {
  matplotlib: `
    import io
    import base64
    from matplotlib import pyplot as plt

    # Clear any existing plots
    plt.clf()
    plt.close('all')

    # Switch to agg backend
    plt.switch_backend('agg')

    def setup_matplotlib_output():
        def custom_show():
            if plt.gcf().get_size_inches().prod() * plt.gcf().dpi ** 2 > 25_000_000:
                print("Warning: Plot size too large, reducing quality")
                plt.gcf().set_dpi(100)

            png_buf = io.BytesIO()
            plt.savefig(png_buf, format='png')
            png_buf.seek(0)
            png_base64 = base64.b64encode(png_buf.read()).decode('utf-8')
            print(f'data:image/png;base64,{png_base64}')
            png_buf.close()

            plt.clf()
            plt.close('all')

        plt.show = custom_show
  `,
  basic: `
    # Basic output capture setup
  `,
};

function detectRequiredHandlers(code: string): string[] {
  const handlers: string[] = ['basic'];

  if (code.includes('matplotlib') || code.includes('plt.')) {
    handlers.push('matplotlib');
  }

  return handlers;
}

interface CodeArtifactMetadata {
  outputs: Array<ConsoleOutput>;
  previewContent?: string | null;
  language?: string | null;
}

const codeActions: Array<ArtifactAction<CodeArtifactMetadata>> = [
  {
    icon: <PlayIcon size={18} />,
    label: 'Run',
    description: 'Execute code',
    condition: (metadata) => metadata?.language === 'python',
    isDisabled: ({ content, metadata }) => {
      console.log('Checking if code is disabled', metadata);
      // Empty/minimal content should default to enabled for Python
      if (!content || content.trim().length < 10) {
        return false;
      }

      return metadata?.language !== 'python';
    },
    onClick: async ({
      content,
      setMetadata,
    }: ArtifactActionContext<CodeArtifactMetadata>) => {
      const runId = generateUUID();
      const outputContent: Array<ConsoleOutputContent> = [];

      setMetadata((metadata) => ({
        ...metadata,
        outputs: [
          ...metadata.outputs,
          {
            id: runId,
            contents: [],
            status: 'in_progress',
          },
        ],
      }));

      try {
        // @ts-expect-error - loadPyodide is not defined
        const currentPyodideInstance = await globalThis.loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.4/full/',
        });

        currentPyodideInstance.setStdut({
          batched: (output: string) => {
            outputContent.push({
              type: output.startsWith('data:image/png;base64')
                ? 'image'
                : 'text',
              value: output,
            });
          },
        });

        await currentPyodideInstance.loadPackagesFromImports(content, {
          messageCallback: (message: string) => {
            setMetadata((metadata) => ({
              ...metadata,
              outputs: [
                ...metadata.outputs.filter((output) => output.id !== runId),
                {
                  id: runId,
                  contents: [{ type: 'text', value: message }],
                  status: 'loading_packages',
                },
              ],
            }));
          },
        });

        const requiredHandlers = detectRequiredHandlers(content);
        for (const handler of requiredHandlers) {
          if (OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS]) {
            await currentPyodideInstance.runPythonAsync(
              OUTPUT_HANDLERS[handler as keyof typeof OUTPUT_HANDLERS],
            );

            if (handler === 'matplotlib') {
              await currentPyodideInstance.runPythonAsync(
                'setup_matplotlib_output()',
              );
            }
          }
        }

        await currentPyodideInstance.runPythonAsync(content);

        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs.filter((output) => output.id !== runId),
            {
              id: runId,
              contents: outputContent,
              status: 'completed',
            },
          ],
        }));
      } catch (error: any) {
        setMetadata((metadata) => ({
          ...metadata,
          outputs: [
            ...metadata.outputs.filter((output) => output.id !== runId),
            {
              id: runId,
              contents: [{ type: 'text', value: error.message }],
              status: 'failed',
            },
          ],
        }));
      }
    },
  },
  {
    id: 'toggle-preview',
    icon: <EyeIcon size={18} />,
    label: 'Preview',
    description: 'Preview HTML/CSS in browser',
    condition: (metadata) =>
      metadata?.language === 'html' && !metadata?.previewContent,
    isDisabled: ({ content, metadata }) => {
      // Empty/minimal content should default to disabled for Preview
      if (!content || content.trim().length < 10) {
        return true;
      }

      return metadata?.language !== 'html';
    },
    onClick: async ({
      content,
      setMetadata,
      metadata,
    }: ArtifactActionContext<CodeArtifactMetadata>) => {
      if (metadata?.language === 'html') {
        setMetadata({
          ...metadata,
          previewContent: content,
          language: 'html',
          outputs: [],
        });
      } else {
        toast.error('Preview is only available for HTML/CSS code.');
      }
    },
  },
  {
    id: 'toggle-code',
    icon: <CodeIcon size={18} />,
    label: 'Code',
    description: 'View Code Editor',
    condition: (metadata) =>
      metadata?.language === 'html' && !!metadata?.previewContent,
    onClick: async ({
      setMetadata,
      metadata,
    }: ArtifactActionContext<CodeArtifactMetadata>) => {
      console.log('Toggling back to code editor');
      setMetadata({
        ...metadata,
        previewContent: null,
      });
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
    icon: <CopyIcon size={18} />,
    description: 'Copy code to clipboard',
    onClick: ({ content }: ArtifactActionContext<CodeArtifactMetadata>) => {
      navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard!');
    },
  },
];

export const codeArtifact = new Artifact<'code', CodeArtifactMetadata>({
  kind: 'code',
  description:
    'Useful for code generation; Code execution is only available for python code.',
  initialize: async ({ setMetadata }) => {
    setMetadata((metadata: any) => ({
      ...metadata,
      outputs: [],
      previewContent: null,
    }));
  },
  onStreamPart: ({ streamPart, setArtifact }) => {
    if (streamPart.type === 'code-delta') {
      setArtifact((draftArtifact) => ({
        ...draftArtifact,
        content: streamPart.content as string,
        isVisible:
          draftArtifact.status === 'streaming' &&
          draftArtifact.content.length > 300 &&
          draftArtifact.content.length < 310
            ? true
            : draftArtifact.isVisible,
        status: 'streaming',
      }));
    }
  },
  content: ({ metadata, setMetadata, ...props }) => {
    // Conditionally render Editor or Preview
    if (metadata?.language === 'html' && metadata.previewContent) {
      return (
        <CodePreview
          htmlContent={metadata.previewContent}
          onClose={() => {
            setMetadata({
              ...metadata,
              previewContent: null,
              language: null,
            });
          }}
        />
      );
    }

    // Default: render Editor and Console
    return (
      <>
        <div className="px-1">
          <CodeEditor {...props} />
        </div>

        {metadata?.outputs && metadata.outputs.length > 0 && (
          <Console
            consoleOutputs={metadata.outputs}
            setConsoleOutputs={() => {
              setMetadata({
                ...metadata,
                outputs: [],
              });
            }}
          />
        )}
      </>
    );
  },
  actions: codeActions,
  toolbar: [
    {
      icon: <MessageIcon />,
      description: 'Add comments',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add comments to the code snippet for understanding',
        });
      },
    },
    {
      icon: <LogsIcon />,
      description: 'Add logs',
      onClick: ({ appendMessage }) => {
        appendMessage({
          role: 'user',
          content: 'Add logs to the code snippet for debugging',
        });
      },
    },
  ],
});
