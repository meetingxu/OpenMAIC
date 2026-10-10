import { afterEach, expect, it, vi } from 'vitest';
import { useSettingsStore } from '@/lib/store/settings';
import { DEFAULT_TTS_VOICES } from '@/lib/audio/constants';

afterEach(() => vi.unstubAllGlobals());

it('migrates the old trial narrator while selecting the server M3 default', async () => {
  useSettingsStore.setState({
    ttsProviderId: 'minimax-tts',
    ttsVoice: 'female-yujie',
    autoConfigApplied: true,
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            trial: { enabled: true, defaultModel: 'minimax:MiniMax-M3' },
            providers: { minimax: { models: ['MiniMax-M3'] } },
            tts: { 'minimax-tts': { models: ['speech-2.8-turbo'] } },
            asr: {},
            pdf: {},
            image: {},
            video: {},
            webSearch: {},
          }),
          { status: 200 },
        ),
    ),
  );
  await useSettingsStore.getState().fetchServerProviders();
  expect(DEFAULT_TTS_VOICES['minimax-tts']).toBe('male-qn-jingying');
  expect(useSettingsStore.getState().ttsVoice).toBe('male-qn-jingying');
  expect(useSettingsStore.getState().modelId).toBe('MiniMax-M3');
});
