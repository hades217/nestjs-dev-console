import type { DevConsoleConfig } from './types';

/**
 * Single source of truth for whether the LOCAL-DEV-ONLY console is active.
 *
 * `POST /dev/login` mints a session for ANY identity — a total auth bypass — so
 * this is gated DEFAULT-DENY: it must NEVER be reachable in production or in an
 * environment whose NODE_ENV is unset/misspelled.
 *
 * Two layers, both required:
 *   1. NODE_ENV allowlist — only `development` or `test`. Anything else
 *      (production, undefined, a typo) ⇒ off. (Allowlist, not `!== 'production'`,
 *      closes the "unset NODE_ENV leaves it open" hole.)
 *   2. An affirmative dev signal — proof this is not a real deployment:
 *      cookies aren't secure (plain-http localhost), an explicit opt-in, OR a
 *      caller-supplied `devSignal` (e.g. "no real mailer key configured").
 *
 * `DEV_CONSOLE_ENABLED=false` is an explicit kill switch that overrides everything.
 */
export function devConsoleEnabled(
  opts: { devSignal?: boolean } = {},
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.DEV_CONSOLE_ENABLED === 'false') return false;

  const nodeEnv = env.NODE_ENV;
  if (nodeEnv !== 'development' && nodeEnv !== 'test') return false;

  const explicit = env.DEV_CONSOLE_ENABLED === 'true';
  const insecureCookies = (env.COOKIE_SECURE ?? 'true') !== 'true';

  return explicit || insecureCookies || Boolean(opts.devSignal);
}

/**
 * Resolves the effective enable decision for a given config: a `config.enabled`
 * override (boolean or thunk) wins; otherwise the default-deny gate decides.
 * The env kill switch (`DEV_CONSOLE_ENABLED=false`) overrides even an override.
 */
export function resolveEnabled(
  config: Pick<DevConsoleConfig, 'enabled' | 'devSignal'>,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.DEV_CONSOLE_ENABLED === 'false') return false;
  if (typeof config.enabled === 'boolean') return config.enabled;
  if (typeof config.enabled === 'function') return config.enabled();
  return devConsoleEnabled({ devSignal: config.devSignal }, env);
}
