import { expect, it } from 'vitest';
import { getModel } from '@/lib/ai/providers';

it('resolves the trial MiniMax highspeed model with enough budget for thinking and HTML', () => {
  const { model, modelInfo } = getModel({
    providerId: 'minimax',
    modelId: 'MiniMax-M2.7-highspeed',
    apiKey: 'test-only',
  });
  expect(modelInfo?.outputWindow).toBe(32768);
  expect(modelInfo?.capabilities?.vision).toBe(false);
  expect((model as { modelId: string }).modelId).toBe('MiniMax-M2.7-highspeed');
});

it('resolves M3 with a 1M context, vision and a full HTML output budget', () => {
  const { model, modelInfo } = getModel({
    providerId: 'minimax',
    modelId: 'MiniMax-M3',
    apiKey: 'test-only',
  });
  expect(modelInfo?.contextWindow).toBe(1000000);
  expect(modelInfo?.outputWindow).toBe(32768);
  expect(modelInfo?.capabilities?.vision).toBe(true);
  expect((model as { modelId: string }).modelId).toBe('MiniMax-M3');
});
