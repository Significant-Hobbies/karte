import { describe, expect, it } from 'vitest';
import {
  isUnthemedProfile,
  resolveThemeConfig,
  THEME_PRESETS,
} from '../src/lib/themes.ts';

describe('default public profile palette', () => {
  it.each([undefined, null, {}, { chatPosition: 'bottom-left' }])(
    'uses gold without a configured palette: %j',
    (config) => {
      expect(isUnthemedProfile(config)).toBe(true);
      expect(resolveThemeConfig(config).accentColor).toBe('#c4a46b');
    },
  );

  it.each(THEME_PRESETS)(
    'preserves the explicitly selected $id palette',
    (preset) => {
      const config = { presetId: preset.id };
      expect(isUnthemedProfile(config)).toBe(false);
      expect(resolveThemeConfig(config)).toMatchObject({
        accentColor: preset.accentColor,
        gradientFrom: preset.gradientFrom,
        gradientTo: preset.gradientTo,
      });
    },
  );

  it('preserves custom colours and chat position without modifying the saved config', () => {
    const config = Object.freeze({
      accentColor: '#67e8f9',
      gradientFrom: '#123456',
      gradientTo: '#654321',
      chatPosition: 'bottom-left',
    });
    expect(isUnthemedProfile(config)).toBe(false);
    expect(resolveThemeConfig(config)).toMatchObject(config);
  });
});

it('uses the established landing gold palette for new drafts', () => {
  expect(resolveThemeConfig({ presetId: 'karte' })).toMatchObject({
    accentColor: '#c4a46b',
    gradientFrom: '#c4a46b',
    gradientTo: '#0a0a0a',
  });
});
