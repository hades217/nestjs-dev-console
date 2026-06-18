import { CanActivate } from '@nestjs/common';
import type { DevConsoleConfig } from './types';
/**
 * Belt-and-suspenders gate for every dev-console route. The module only wires the
 * controller when enabled, but this guard RE-CHECKS at request time so a route can
 * never serve if the env flips (e.g. `DEV_CONSOLE_ENABLED=false` set after boot).
 * Throws 404 (not 403) so the endpoint is indistinguishable from "does not exist"
 * when disabled — no information leak that a dev backdoor exists.
 */
export declare class DevConsoleGuard implements CanActivate {
    private readonly config;
    constructor(config: DevConsoleConfig);
    canActivate(): boolean;
}
