/** Shared app-level admission guard for direct Workers AI binding calls. */
const WORKERS_AI_DAILY_NEURON_CAP = 9_500;
const DEFAULT_WORKERS_AI_OUTPUT_TOKENS = 512;
const MAX_WORKERS_AI_OUTPUT_TOKENS = 8_192;

// Cloudflare Workers AI pricing table, exact model IDs only (checked 2026-10-02).
// Other IDs such as the former `...-instruct-fast` default stay absent: never infer aliases.
const PRICED_TEXT_MODELS: Record<string, { input: number; output: number }> = {
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { input: 4_119, output: 34_868 },
};

export class SharedNeuronBudgetError extends Error {
  constructor() {
    super('Workers AI is unavailable under the shared daily neuron budget.');
    this.name = 'SharedNeuronBudgetError';
  }
}

export interface NeuronBudgetNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): {
    fetch(input: string, init: RequestInit): Promise<Response>;
  };
}

const UNSUPPORTED_MEDIA_KEYS = new Set([
  'image',
  'images',
  'image_url',
  'audio',
  'video',
  'file',
  'files',
  'media',
  'blob',
  'buffer',
  'bytes',
]);

type WorkersAiRun = (
  model: string,
  inputs: Record<string, unknown>,
  options?: unknown,
) => Promise<unknown>;

function assertTextOnly(value: unknown, seen = new Set<object>()): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) throw new SharedNeuronBudgetError();
  seen.add(value);
  if (
    ArrayBuffer.isView(value) ||
    value instanceof ArrayBuffer ||
    (typeof Blob !== 'undefined' && value instanceof Blob)
  ) {
    throw new SharedNeuronBudgetError();
  }
  if (Array.isArray(value)) {
    for (const item of value) assertTextOnly(item, seen);
    return;
  }
  if (
    'type' in value &&
    typeof value.type === 'string' &&
    UNSUPPORTED_MEDIA_KEYS.has(value.type.toLowerCase())
  ) {
    throw new SharedNeuronBudgetError();
  }
  for (const [key, item] of Object.entries(value)) {
    if (UNSUPPORTED_MEDIA_KEYS.has(key.toLowerCase())) {
      throw new SharedNeuronBudgetError();
    }
    assertTextOnly(item, seen);
  }
}

function prepareBudgetedWorkersAiInput(
  model: string,
  input: Record<string, unknown>,
): { input: Record<string, unknown>; neurons: number } {
  const price = PRICED_TEXT_MODELS[model];
  if (!price) throw new SharedNeuronBudgetError();
  assertTextOnly(input);

  const requestedTokens = input.max_tokens ?? DEFAULT_WORKERS_AI_OUTPUT_TOKENS;
  if (!Number.isSafeInteger(requestedTokens) || Number(requestedTokens) < 1) {
    throw new SharedNeuronBudgetError();
  }
  const maxTokens = Math.min(
    Number(requestedTokens),
    MAX_WORKERS_AI_OUTPUT_TOKENS,
  );
  const boundedInput = { ...input, max_tokens: maxTokens };
  let serialized: string;
  try {
    serialized = JSON.stringify(boundedInput);
  } catch {
    throw new SharedNeuronBudgetError();
  }
  if (typeof serialized !== 'string') throw new SharedNeuronBudgetError();

  // UTF-8 byte length upper-bounds text-token count; serializing the complete
  // provider input also includes message framing, options, tools, and JSON schema.
  const inputBytes = new TextEncoder().encode(serialized).byteLength;
  const estimated = Math.ceil(
    ((inputBytes * price.input + maxTokens * price.output) / 1_000_000) * 1.2,
  );
  const neurons = Math.max(1, estimated);
  if (!Number.isSafeInteger(neurons) || neurons > WORKERS_AI_DAILY_NEURON_CAP) {
    throw new SharedNeuronBudgetError();
  }
  return { input: boundedInput, neurons };
}

async function reserveNeuronBudget(
  budget: NeuronBudgetNamespace | undefined,
  neurons: number,
): Promise<void> {
  try {
    if (!budget) throw new Error('budget binding unavailable');
    const response = await budget
      .get(budget.idFromName('global-budget'))
      .fetch('https://internal.local/try-debit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ neurons }),
      });
    if (response.status !== 200) throw new Error('budget request failed');
    const payload: unknown = await response.json();
    if (
      payload === null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error('budget receipt is not an object');
    }
    const result = payload as Record<string, unknown>;
    const today = new Date().toISOString().slice(0, 10);
    if (
      result.allowed !== true ||
      result.dayKey !== today ||
      result.retryAfter !== 0 ||
      !Number.isSafeInteger(result.used) ||
      Number(result.used) < neurons ||
      !Number.isSafeInteger(result.remaining) ||
      Number(result.remaining) < 0 ||
      Number(result.used) + Number(result.remaining) !==
        WORKERS_AI_DAILY_NEURON_CAP
    )
      throw new Error('budget admission invalid');
  } catch {
    throw new SharedNeuronBudgetError();
  }
}

export function withSharedNeuronBudget<T extends object>(
  binding: T,
  budget: NeuronBudgetNamespace | undefined,
): T {
  return new Proxy(binding, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property !== 'run' || typeof value !== 'function') {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return async (
        model: string,
        inputs: Record<string, unknown>,
        options?: unknown,
      ) => {
        const prepared = prepareBudgetedWorkersAiInput(model, inputs);
        await reserveNeuronBudget(budget, prepared.neurons);
        return (value as WorkersAiRun).call(
          target,
          model,
          prepared.input,
          options,
        );
      };
    },
  });
}
