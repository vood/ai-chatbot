import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  type LanguageModelV1,
} from 'ai';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// Default model configuration
const defaultModelConfig = {
  'chat-model': 'openai/gpt-4o',
  'chat-model-reasoning': 'openai/o3-mini',
  'chat-websearch': 'openai/gpt-4o:search',
  'title-model': 'openai/gpt-4o-mini',
  'artifact-model': 'anthropic/claude-3-7-sonnet',
};

// Helper function to get a model instance based on the model ID
export function getLanguageModel(modelId: string): LanguageModelV1 {
  // Check if it's a predefined key
  if (modelId in defaultModelConfig) {
    const key = modelId as keyof typeof defaultModelConfig;
    return openrouter(defaultModelConfig[key]);
  }

  // If not found, treat it as a direct OpenRouter model ID
  return openrouter(modelId);
}

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // Support for predefined model keys
        'chat-model': openrouter(defaultModelConfig['chat-model']),
        'chat-model-reasoning': wrapLanguageModel({
          model: openrouter(defaultModelConfig['chat-model-reasoning']),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'chat-websearch': openrouter(defaultModelConfig['chat-websearch']),
        'title-model': openrouter(defaultModelConfig['title-model']),
        'artifact-model': openrouter(defaultModelConfig['artifact-model']),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
