import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const posthog = vi.hoisted(() => ({ capture: vi.fn() }));

vi.mock('posthog-js', () => ({ default: posthog }));
vi.stubGlobal('window', {});

const { trackProfileModeConfigured, trackProfileModeGenerated } = await import(
  '../src/lib/analytics-events.ts'
);

async function read(relativePath) {
  return readFile(resolve(ROOT, relativePath), 'utf8');
}

afterEach(() => {
  posthog.capture.mockClear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('owner profile-mode event contract', () => {
  it('captures comparable chat configuration without private properties', () => {
    trackProfileModeConfigured({
      mode: 'chat',
      enabled: true,
      source: 'chat_settings',
    });

    expect(posthog.capture).toHaveBeenCalledWith('profile_mode_configured', {
      project_id: 'linkchat',
      mode: 'chat',
      enabled: true,
      source: 'chat_settings',
    });
  });

  it('preserves the generated event name with fixed project and source', () => {
    trackProfileModeGenerated({
      mode: 'roast',
      source: 'public_mode_route',
    });

    expect(posthog.capture).toHaveBeenCalledWith('profile_mode_generated', {
      project_id: 'linkchat',
      mode: 'roast',
      source: 'public_mode_route',
    });
  });
});

describe('owner action call sites', () => {
  it('routes chat and generated-mode configuration through the helper', async () => {
    const chat = await read('src/components/dashboard/chat-settings.tsx');
    const appearance = await read('src/components/dashboard/page-toggles.tsx');

    expect(chat).toContain('trackProfileModeConfigured({');
    expect(chat).toContain("mode: 'chat'");
    expect(chat).toContain("source: 'chat_settings'");
    expect(appearance).toContain('touchedModes.current.has');
    expect(appearance).toContain('touchedModes.current.clear()');
    expect(appearance).toContain("source: 'appearance_settings'");
    for (const mode of ['encyclopedia', 'newspaper', 'roast']) {
      expect(appearance).toContain(`settingsKey: '${mode}'`);
    }
    expect(chat.indexOf('if (!res.ok)')).toBeLessThan(
      chat.indexOf('trackProfileModeConfigured({'),
    );
    expect(appearance.indexOf('if (!res.ok)')).toBeLessThan(
      appearance.indexOf('trackProfileModeConfigured({'),
    );
  });

  it('normalizes every generated-mode capture through the helper', async () => {
    const files = [
      'src/components/dashboard/page-toggles.tsx',
      'src/components/dashboard/encyclopedia-editor.tsx',
      'src/components/public/encyclopedia/generate-encyclopedia.tsx',
      'src/components/public/newspaper/generate-newspaper.tsx',
      'src/components/public/roast/roast-page-client.tsx',
    ];

    for (const file of files) {
      const source = await read(file);
      expect(source, file).toContain('trackProfileModeGenerated({');
      expect(source, file).not.toContain(
        "posthog.capture('profile_mode_generated'",
      );
      expect(source.indexOf('if (!res.ok)'), file).toBeLessThan(
        source.indexOf('trackProfileModeGenerated({'),
      );
    }
  });

  it('keeps sensitive values outside helper call payloads', async () => {
    const analytics = await read('src/lib/analytics-events.ts');
    const helperBlock = analytics.slice(
      analytics.indexOf('export function trackProfileModeConfigured'),
    );

    for (const field of [
      'pageId',
      'profileId',
      'slug',
      'displayName',
      'email',
      'prompt',
      'content',
      'transcript',
      'visitorId',
    ]) {
      expect(helperBlock).not.toContain(field);
    }
  });
});
