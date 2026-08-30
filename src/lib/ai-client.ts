import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { generateText, type LanguageModel } from 'ai';
import { createWorkersAI, type WorkersAISettings } from 'workers-ai-provider';

type WorkersAiBinding = Extract<
  WorkersAISettings,
  { binding: unknown }
>['binding'];
const DEFAULT_WORKERS_AI_MODEL = '@cf/meta/llama-3.1-8b-instruct';
const SYNCHRONOUS_CLOUDFLARE_CONTEXT = { async: false } as const;

export type AiConfig = {
  binding?: WorkersAiBinding;
  endpointUrl?: string;
  apiKey?: string;
  model: string;
};

export function getDefaultAiConfig(): AiConfig | null {
  try {
    const { env } = getCloudflareContext(SYNCHRONOUS_CLOUDFLARE_CONTEXT);
    const binding = (env as { AI?: WorkersAiBinding }).AI;
    if (binding) return { binding, model: DEFAULT_WORKERS_AI_MODEL };
  } catch {
    // Node tests and operator scripts fall through to explicit direct config.
  }

  const endpointUrl = process.env.LINKCHAT_DEFAULT_AI_ENDPOINT_URL;
  const apiKey = process.env.LINKCHAT_DEFAULT_AI_API_KEY;
  const model = process.env.LINKCHAT_DEFAULT_AI_MODEL;
  if (!endpointUrl || !apiKey || !model) return null;

  return {
    endpointUrl,
    apiKey,
    model,
  };
}

export function resolveAiConfig(config?: {
  aiEndpointUrl?: string | null;
  aiApiKey?: string | null;
  aiModel?: string | null;
}): AiConfig | null {
  if (config?.aiEndpointUrl && config.aiApiKey && config.aiModel) {
    return {
      endpointUrl: config.aiEndpointUrl,
      apiKey: config.aiApiKey,
      model: config.aiModel,
    };
  }

  return getDefaultAiConfig();
}

export type ReasoningLevel = 'fast' | 'deep';

function modelForReasoning(
  config: AiConfig,
  reasoningLevel?: ReasoningLevel,
): string {
  if (reasoningLevel === 'fast' && process.env.LINKCHAT_FAST_AI_MODEL) {
    return process.env.LINKCHAT_FAST_AI_MODEL;
  }
  return config.model;
}

function getModel(
  config: AiConfig,
  reasoningLevel?: ReasoningLevel,
): LanguageModel {
  const model = modelForReasoning(config, reasoningLevel);
  if (config.binding)
    return createWorkersAI({ binding: config.binding })(model);
  if (!config.endpointUrl || !config.apiKey) {
    throw new Error('Direct AI endpoint URL and API key are required');
  }
  const provider = createOpenAICompatible({
    name: 'linkchat-direct',
    baseURL: config.endpointUrl,
    apiKey: config.apiKey,
  });
  return provider.chatModel(model);
}

// Latency vs. quality intent. Karte surfaces decide based on UX and may set a
// separate project-owned fast model through LINKCHAT_FAST_AI_MODEL:
//   - `fast`  → chat, demo-chat, welcome cards (real-time / one-shot
//               where latency matters)
//   - `deep`  → newspaper, encyclopedia, roast (one-shot generations
//               where output quality matters more than latency)

/**
 * Generate a non-streaming text completion.
 */
export async function generate(
  config: AiConfig,
  opts: {
    system: string;
    prompt: string;
    reasoningLevel?: ReasoningLevel;
    maxOutputTokens?: number;
    timeoutMs?: number;
  },
): Promise<string> {
  const { text } = await generateText({
    model: getModel(config, opts.reasoningLevel),
    system: opts.system,
    prompt: opts.prompt,
    maxRetries: 0,
    ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    ...(opts.timeoutMs ? { timeout: { totalMs: opts.timeoutMs } } : {}),
  });
  return text;
}

/**
 * Generate a non-streaming completion from a message history. Same shape
 * as `generate()` but for multi-turn conversations.
 */
export async function generateChat(
  config: AiConfig,
  opts: {
    system: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    reasoningLevel?: ReasoningLevel;
    maxOutputTokens?: number;
    timeoutMs?: number;
  },
): Promise<string> {
  const { text } = await generateText({
    model: getModel(config, opts.reasoningLevel),
    system: opts.system,
    messages: opts.messages,
    maxRetries: 0,
    ...(opts.maxOutputTokens ? { maxOutputTokens: opts.maxOutputTokens } : {}),
    ...(opts.timeoutMs ? { timeout: { totalMs: opts.timeoutMs } } : {}),
  });
  return text;
}

/**
 * List available models from an OpenAI-compatible endpoint.
 */
export async function listModels(
  endpointUrl: string,
  apiKey: string,
): Promise<{ id: string; name?: string }[]> {
  // The /models endpoint is standard across OpenAI-compatible APIs
  const baseUrl = endpointUrl.replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list models: ${res.status}`);
  }

  const data = await res.json();
  const models = data.data || data.models || data;

  if (!Array.isArray(models)) return [];

  return models.map((m: { id: string; name?: string }) => ({
    id: m.id,
    name: m.name,
  }));
}
