import { generateText } from 'ai';
import { describe, expect, it, vi } from 'vitest';
import { createWorkersAI } from 'workers-ai-provider';
import {
  SharedNeuronBudgetError,
  withSharedNeuronBudget,
} from '../src/lib/workers-ai-budget';

const pricedModel = '@cf/meta/llama-3.1-8b-instruct-fp8-fast';
const today = () => new Date().toISOString().slice(0, 10);

function budgetNamespace({
  allowed = true,
  malformed = false,
  usedOverride,
  retryAfterOverride,
  dayKeyOverride,
  payloadOverride,
  overridePayload = false,
  statusOverride = 200,
} = {}) {
  const calls = [];
  return {
    calls,
    idFromName: vi.fn((name) => name),
    get: vi.fn(() => ({
      fetch: vi.fn(async (url, init) => {
        const body = JSON.parse(String(init.body));
        calls.push({ url, body });
        return Response.json(
          overridePayload
            ? payloadOverride
            : malformed
              ? {
                  allowed: true,
                  used: body.neurons,
                  remaining: 1,
                  retryAfter: 0,
                  dayKey: dayKeyOverride ?? today(),
                }
              : {
                  allowed,
                  used: usedOverride ?? (allowed ? body.neurons : 0),
                  remaining: allowed
                    ? 9500 - (usedOverride ?? body.neurons)
                    : 9500,
                  retryAfter: retryAfterOverride ?? (allowed ? 0 : 60),
                  dayKey: dayKeyOverride ?? today(),
                },
          { status: statusOverride },
        );
      }),
    })),
  };
}

describe('shared Workers AI neuron admission', () => {
  it('estimates UTF-8 request and output neurons, defaults to 512 tokens, and debits every run', async () => {
    const run = vi.fn(async (_model, inputs) => ({
      response: String(inputs.max_tokens),
    }));
    const budget = budgetNamespace();
    const binding = withSharedNeuronBudget({ run }, budget);
    const input = { messages: [{ role: 'user', content: '🙂' }] };

    expect(
      await binding.run(pricedModel, input, { signal: 'forwarded' }),
    ).toEqual({ response: '512' });
    await binding.run(pricedModel, input);
    expect(run).toHaveBeenCalledTimes(2);
    expect(run.mock.calls[0][1]).toMatchObject({ max_tokens: 512 });
    expect(run.mock.calls[0][2]).toEqual({ signal: 'forwarded' });
    const expectedInputBytes = new TextEncoder().encode(
      JSON.stringify({ ...input, max_tokens: 512 }),
    ).byteLength;
    const expected = Math.ceil(
      ((expectedInputBytes * 4119 + 512 * 34868) / 1_000_000) * 1.2,
    );
    // Use the known exact fp8-fast input/output pricing; each underlying call is reserved separately.
    expect(expected).toBe(22);
    expect(budget.calls).toHaveLength(2);
    expect(budget.calls.map((call) => call.body.neurons)).toEqual([22, 22]);
  });

  it('guards the actual SDK binding payload and actual output limit', async () => {
    const run = vi.fn().mockResolvedValue({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 1 },
    });
    const budget = budgetNamespace();
    const model = createWorkersAI({
      binding: withSharedNeuronBudget({ run }, budget),
    })(pricedModel);
    await generateText({
      model,
      prompt: 'synthetic user text',
      maxOutputTokens: 23,
      maxRetries: 0,
    });

    const [modelId, actualInputs] = run.mock.calls[0];
    expect(modelId).toBe(pricedModel);
    expect(actualInputs.max_tokens).toBe(23);
    const serialized = JSON.stringify(actualInputs);
    const expected = Math.ceil(
      ((new TextEncoder().encode(serialized).byteLength * 4119 + 23 * 34868) /
        1_000_000) *
        1.2,
    );
    expect(budget.calls[0].body.neurons).toBe(expected);
  });

  it('bounds explicit output tokens before sending the model request', async () => {
    const run = vi.fn().mockResolvedValue({ response: 'ok' });
    const budget = budgetNamespace();
    await withSharedNeuronBudget({ run }, budget).run(pricedModel, {
      messages: [{ role: 'user', content: 'short' }],
      max_tokens: 9000,
    });
    expect(run.mock.calls[0][1].max_tokens).toBe(8192);
    expect(budget.calls[0].body.neurons).toBeGreaterThan(300);
  });

  it('fails closed for the unpriced legacy alias before budget or inference', async () => {
    const run = vi.fn();
    const budget = budgetNamespace();
    await expect(
      withSharedNeuronBudget({ run }, budget).run(
        '@cf/meta/llama-3.1-8b-instruct-fast',
        { messages: [{ role: 'user', content: 'synthetic' }], max_tokens: 48 },
      ),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    expect(budget.calls).toHaveLength(0);
    expect(run).not.toHaveBeenCalled();
  });

  it('fails closed on denied, malformed, missing, or unsupported modality admission before inference', async () => {
    const deniedRun = vi.fn();
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ allowed: false }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ malformed: true }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ usedOverride: 1 }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ retryAfterOverride: 60 }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ payloadOverride: [], overridePayload: true }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ dayKeyOverride: '2000-01-01' }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ payloadOverride: null, overridePayload: true }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget(
        { run: deniedRun },
        budgetNamespace({ statusOverride: 201 }),
      ).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget({ run: deniedRun }, undefined).run(pricedModel, {
        messages: [{ role: 'user', content: 'synthetic' }],
      }),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget({ run: deniedRun }, budgetNamespace()).run(
        pricedModel,
        {
          messages: [
            {
              role: 'user',
              content: [{ type: 'image_url', image_url: 'data:...' }],
            },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    await expect(
      withSharedNeuronBudget({ run: deniedRun }, budgetNamespace()).run(
        pricedModel,
        {
          messages: [
            { role: 'user', content: [{ type: 'image', data: 'opaque' }] },
          ],
        },
      ),
    ).rejects.toBeInstanceOf(SharedNeuronBudgetError);
    expect(deniedRun).not.toHaveBeenCalled();
  });
});
