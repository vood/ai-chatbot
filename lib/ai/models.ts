import {
  type LucideIcon,
  Image as ImageIcon,
  Bot,
  Zap,
  Wind,
} from 'lucide-react'; // Example icons

export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];

export interface ImageModelDefinition {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  iconComponent?: LucideIcon | React.FC<React.SVGProps<SVGSVGElement>>;
  toolName: string;
}

// Helper to generate tool name
const generateToolName = (modelId: string): string => {
  const toolIdentifier = modelId.replace(/[^a-zA-Z0-9]/g, '_');
  return `generate_image_using_${toolIdentifier}`;
};

// Assign icons and toolNames to models
export const SUPPORTED_IMAGE_MODELS: ImageModelDefinition[] = [
  {
    id: 'stability-ai/stable-diffusion-3',
    name: 'Stable Diffusion 3',
    provider: 'Stability AI',
    description:
      'Advanced open-source model with strong artistic capabilities.',
    iconComponent: Wind,
    toolName: generateToolName('stability-ai/stable-diffusion-3'),
  },
  {
    id: 'dall-e-3',
    name: 'DALL·E 3',
    provider: 'OpenAI',
    description: 'Powerful model with excellent prompt following.',
    iconComponent: Zap,
    toolName: generateToolName('dall-e-3'),
  },
  {
    id: 'black-forest-labs/flux-dev',
    name: 'FLUX.1 Dev',
    provider: 'Black Forest Labs',
    description: 'High-quality creative generation with excellent coherence.',
    iconComponent: Bot,
    toolName: generateToolName('black-forest-labs/flux-dev'),
  },
  {
    id: 'recraft-ai/recraft-v3',
    name: 'Recraft V3',
    provider: 'Recraft',
    description: 'Exceptional detail and realism (exclusive).',
    iconComponent: ImageIcon,
    toolName: generateToolName('recraft-ai/recraft-v3'),
  },
];

// Default tool name corresponds to the default model ID
export const DEFAULT_IMAGE_TOOL_NAME =
  SUPPORTED_IMAGE_MODELS[0]?.toolName || '';
// Keep default ID if needed elsewhere
export const DEFAULT_IMAGE_MODEL_ID = SUPPORTED_IMAGE_MODELS[0]?.id || '';
