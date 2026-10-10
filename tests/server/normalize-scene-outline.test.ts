import { describe, expect, it } from 'vitest';
import { normalizeSceneOutline } from '@/lib/server/normalize-scene-outline';
import type { SceneOutline } from '@/lib/types/generation';

describe('model outline widget aliases', () => {
  it.each(['diagram', 'simulation', 'code', 'game', 'visualization3d', 'procedural-skill'])(
    'normalizes %s while preserving saved outline identity',
    (type) => {
      const outline = {
        id: 'saved',
        order: 4,
        title: 'Test',
        description: '',
        keyPoints: [],
        type,
      } as unknown as SceneOutline;
      expect(normalizeSceneOutline(outline)).toEqual({
        ...outline,
        type: 'interactive',
        widgetType: type,
        widgetOutline: { concept: 'Test' },
      });
    },
  );
  it.each(['slide', 'quiz', 'interactive', 'pbl', 'unknown'])('does not reinterpret %s', (type) => {
    const outline = { type } as unknown as SceneOutline;
    expect(normalizeSceneOutline(outline)).toBe(outline);
  });
});
