/**
 * Which backend the app is talking to.
 *
 * Local mode is not a separate build: it is simply what happens when no
 * Supabase project is configured, so `npm run dev` works on a fresh clone and
 * switches over the moment the real credentials are added to `.env.local`.
 */
export function isLocalMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL;
}

/** True when weekly evaluations have to be produced without the Claude API. */
export function isLocalAiMode(): boolean {
  return !process.env.ANTHROPIC_API_KEY;
}
