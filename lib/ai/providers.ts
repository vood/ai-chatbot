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
        'chat-model': openrouter('anthropic/claude-3.7-sonnet'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openrouter('anthropic/claude-3.7-sonnet:thinking'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'chat-websearch': openrouter('anthropic/claude-3.7-sonnet:search'),
        'title-model': openrouter('anthropic/claude-3.5-haiku'),
        'artifact-model': openrouter('anthropic/claude-3.7-sonnet'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
