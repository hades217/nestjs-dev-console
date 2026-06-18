import { devConsoleEnabled, resolveEnabled } from './dev-console.enabled';

describe('devConsoleEnabled (default-deny gate)', () => {
  it('is OFF when NODE_ENV is production even with a dev signal', () => {
    expect(devConsoleEnabled({ devSignal: true }, { NODE_ENV: 'production' })).toBe(false);
  });

  it('is OFF when NODE_ENV is unset (no allowlist match)', () => {
    expect(devConsoleEnabled({ devSignal: true }, {})).toBe(false);
  });

  it('is OFF in development with no affirmative signal (secure cookies, no opt-in)', () => {
    expect(devConsoleEnabled({}, { NODE_ENV: 'development', COOKIE_SECURE: 'true' })).toBe(false);
  });

  it('is ON in development when cookies are insecure (plain-http localhost)', () => {
    expect(devConsoleEnabled({}, { NODE_ENV: 'development', COOKIE_SECURE: 'false' })).toBe(true);
  });

  it('is ON in development with an explicit opt-in', () => {
    expect(
      devConsoleEnabled({}, { NODE_ENV: 'development', COOKIE_SECURE: 'true', DEV_CONSOLE_ENABLED: 'true' }),
    ).toBe(true);
  });

  it('is ON in development with a caller-supplied devSignal', () => {
    expect(devConsoleEnabled({ devSignal: true }, { NODE_ENV: 'development', COOKIE_SECURE: 'true' })).toBe(true);
  });

  it('kill switch DEV_CONSOLE_ENABLED=false overrides every other signal', () => {
    expect(
      devConsoleEnabled(
        { devSignal: true },
        { NODE_ENV: 'development', COOKIE_SECURE: 'false', DEV_CONSOLE_ENABLED: 'false' },
      ),
    ).toBe(false);
  });
});

describe('resolveEnabled (config override layer)', () => {
  const dev = { NODE_ENV: 'development', COOKIE_SECURE: 'true' };

  it('boolean override forces on', () => {
    expect(resolveEnabled({ enabled: true }, dev)).toBe(true);
  });

  it('function override is evaluated', () => {
    expect(resolveEnabled({ enabled: () => true }, dev)).toBe(true);
    expect(resolveEnabled({ enabled: () => false }, dev)).toBe(false);
  });

  it('kill switch beats even an explicit override', () => {
    expect(resolveEnabled({ enabled: true }, { ...dev, DEV_CONSOLE_ENABLED: 'false' })).toBe(false);
  });

  it('falls back to the default-deny gate when no override', () => {
    expect(resolveEnabled({ devSignal: true }, dev)).toBe(true);
    expect(resolveEnabled({}, dev)).toBe(false);
  });
});
