/** Runtime policy for the invitation-only trial deployment. No secrets are public. */
export function isTrialMode(): boolean {
  return process.env.TRIAL_MODE === 'true';
}

// These APIs expose shared operator data or require real owner authentication.
// The first trial uses browser-local storage rather than shared account storage.
const PRIVATE_API_ROOTS = [
  '/api/usage',
  '/api/persistence',
  '/api/agent',
  '/api/materials',
  '/api/folders',
  '/api/stages',
  '/api/stage-meta',
  '/api/skills',
  '/api/generate-classroom',
  '/api/provider',
  '/api/verify-model',
  '/api/verify-image-provider',
  '/api/verify-video-provider',
  '/api/verify-pdf-provider',
  '/api/comfyui-workflows',
];

export function isTrialPrivateApi(pathname: string): boolean {
  return PRIVATE_API_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function validateTrialEnvironment(): void {
  if (!isTrialMode()) return;
  if ([...(process.env.ACCESS_CODE ?? '')].length < 16) {
    throw new Error('Trial deployment requires ACCESS_CODE of at least 16 characters.');
  }
  if (!process.env.DEFAULT_MODEL?.includes(':')) {
    throw new Error('Trial deployment requires DEFAULT_MODEL in provider:model format.');
  }
  if (process.env.NEXT_PUBLIC_PERSISTENCE === '1' || process.env.DATABASE_URL) {
    throw new Error(
      'Trial deployment uses browser-local storage; shared server persistence is disabled.',
    );
  }
}
