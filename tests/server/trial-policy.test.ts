import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { createAccessToken } from '@/lib/server/access-token';
import { validateTrialEnvironment } from '@/lib/server/trial-policy';

afterEach(() => vi.unstubAllEnvs());

describe('invitation trial policy', () => {
  it('fails closed without an access code, including API requests', async () => {
    vi.stubEnv('TRIAL_MODE', 'true');
    vi.stubEnv('ACCESS_CODE', '');
    expect(() => validateTrialEnvironment()).toThrow(/ACCESS_CODE/);
    const response = await middleware(new NextRequest('https://trial.example/api/chat'));
    expect(response.status).toBe(503);
  });

  it('requires a server default and rejects shared persistence', () => {
    vi.stubEnv('TRIAL_MODE', 'true');
    vi.stubEnv('ACCESS_CODE', 'a-random-test-code-32-characters');
    vi.stubEnv('DEFAULT_MODEL', '');
    expect(() => validateTrialEnvironment()).toThrow(/DEFAULT_MODEL/);
    vi.stubEnv('DEFAULT_MODEL', 'minimax:trial-model');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_PERSISTENCE', '1');
    expect(() => validateTrialEnvironment()).toThrow(/persistence/);
    vi.stubEnv('NEXT_PUBLIC_PERSISTENCE', '');
    expect(() => validateTrialEnvironment()).not.toThrow();
  });

  it('blocks operator data even with a valid invitation cookie', async () => {
    const code = 'a-random-test-code-32-characters';
    vi.stubEnv('TRIAL_MODE', 'true');
    vi.stubEnv('ACCESS_CODE', code);
    const token = createAccessToken(code);
    for (const path of [
      '/api/usage',
      '/api/persistence/kv',
      '/api/agent/sessions',
      '/api/generate-classroom/123',
    ]) {
      const response = await middleware(
        new NextRequest(`https://trial.example${path}`, {
          headers: { cookie: `openmaic_access=${token}` },
        }),
      );
      expect(response.status).toBe(403);
    }
    const allowed = await middleware(
      new NextRequest('https://trial.example/api/server-providers', {
        headers: { cookie: `openmaic_access=${token}` },
      }),
    );
    expect(allowed.status).toBe(200);
    const denied = await middleware(new NextRequest('https://trial.example/api/server-providers'));
    expect(denied.status).toBe(401);
  });
});
