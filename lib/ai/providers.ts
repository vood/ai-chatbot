import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
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
        'chat-model': openrouter('openai/gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openrouter('openai/o3-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'chat-websearch': openrouter('openai/gpt-4o:search'),
        'title-model': openrouter('openai/gpt-4o-mini'),
        'artifact-model': openrouter('anthropic/claude-3-7-sonnet'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
