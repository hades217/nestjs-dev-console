import { NotFoundException } from '@nestjs/common';

import { DevConsoleGuard } from './dev-console.guard';
import type { DevConsoleConfig } from './types';

const cfg = (over: Partial<DevConsoleConfig>): DevConsoleConfig => ({ apps: {}, ...over });

describe('DevConsoleGuard', () => {
  it('404s (NotFound) when the config resolves disabled', () => {
    const guard = new DevConsoleGuard(cfg({ enabled: false }));
    expect(() => guard.canActivate()).toThrow(NotFoundException);
  });

  it('allows the request when the config resolves enabled', () => {
    const guard = new DevConsoleGuard(cfg({ enabled: true }));
    expect(guard.canActivate()).toBe(true);
  });
});
