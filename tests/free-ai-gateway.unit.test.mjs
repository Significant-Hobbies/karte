import assert from 'node:assert/strict';
import { beforeEach, describe, it, vi } from 'vitest';

const { getContext } = vi.hoisted(() => ({ getContext: vi.fn() }));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: getContext }));

const { generateText, jsonSchema, Output, streamText } = await import('ai');
const { createFreeAiGatewayModel, getDefaultAiConfig, resolveAiConfig } =
  await import('../src/lib/ai-client.ts');

function makeGateway() {
  const requests = [];
  const fetch = vi.fn(async (request) => {
    requests.push(request);
    const body = JSON.parse(await request.clone().text());
    if (body.stream) {
      return new Response(
        'data: {"choices":[{"delta":{"content":"streamed"},"finish_reason":null}]}\n\n' +
          'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n\n' +
          'data: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } },
      );
    }
    return Response.json({
      choices: [
        {
          message: { role: 'assistant', content: '{"ok":true}' },
          finish_reason: 'stop',
        },
      ],
    });
  });
  return { gateway: { fetch }, fetch, requests };
}

describe('Free AI gateway model', () => {
  beforeEach(() => getContext.mockReset());

  it('sends attributed JSON and streaming SDK calls through the binding and fails closed in production', async () => {
    const { gateway, fetch, requests } = makeGateway();
    const model = createFreeAiGatewayModel(gateway);
    await generateText({
      model,
      prompt: 'synthetic json probe',
      output: Output.object({
        schema: jsonSchema({
          type: 'object',
          properties: { ok: { type: 'boolean' } },
          required: ['ok'],
        }),
      }),
      maxOutputTokens: 73,
      maxRetries: 0,
    });
    const stream = streamText({
      model,
      prompt: 'synthetic stream probe',
      maxRetries: 0,
    });
    await assert.doesNotReject(async () =>
      assert.equal(await stream.text, 'streamed'),
    );

    assert.equal(fetch.mock.calls.length, 2);
    for (const request of requests) {
      assert.equal(
        request.url,
        'https://fleet-gateway.internal/v1/chat/completions',
      );
      assert.equal(request.headers.get('x-gateway-project-id'), 'karte');
      assert.equal(
        request.headers.get('authorization'),
        'Bearer service-binding',
      );
      assert.equal(JSON.parse(await request.clone().text()).model, 'auto');
    }
    const jsonBody = JSON.parse(await requests[0].clone().text());
    assert.deepEqual(jsonBody.response_format, { type: 'json_object' });
    assert.equal(jsonBody.max_tokens, 73);
    assert.equal(JSON.parse(await requests[1].clone().text()).stream, true);

    getContext.mockReturnValue({ env: { NODE_ENV: 'production' } });
    assert.throws(() => getDefaultAiConfig(), /required in production/);
  });

  it('keeps explicit owner BYOK ahead of managed gateway config', () => {
    const { gateway } = makeGateway();
    getContext.mockReturnValue({
      env: { NODE_ENV: 'production', FREE_AI: gateway },
    });
    assert.deepEqual(
      resolveAiConfig({
        aiEndpointUrl: 'https://provider.example/v1',
        aiApiKey: 'synthetic-test-key',
        aiModel: 'provider-model',
      }),
      {
        endpointUrl: 'https://provider.example/v1',
        apiKey: 'synthetic-test-key',
        model: 'provider-model',
      },
    );
  });
});
