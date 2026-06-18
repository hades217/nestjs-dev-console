import { CanActivate, Inject, Injectable, NotFoundException } from '@nestjs/common';

import { resolveEnabled } from './dev-console.enabled';
import { DEV_CONSOLE_CONFIG } from './tokens';
import type { DevConsoleConfig } from './types';

/**
 * Belt-and-suspenders gate for every dev-console route. The module only wires the
 * controller when enabled, but this guard RE-CHECKS at request time so a route can
 * never serve if the env flips (e.g. `DEV_CONSOLE_ENABLED=false` set after boot).
 * Throws 404 (not 403) so the endpoint is indistinguishable from "does not exist"
 * when disabled — no information leak that a dev backdoor exists.
 */
@Injectable()
export class DevConsoleGuard implements CanActivate {
  constructor(@Inject(DEV_CONSOLE_CONFIG) private readonly config: DevConsoleConfig) {}

  canActivate(): boolean {
    if (!resolveEnabled(this.config)) {
      throw new NotFoundException();
    }
    return true;
  }
}
