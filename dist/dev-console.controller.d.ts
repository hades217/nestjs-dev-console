import type { Request, Response } from 'express';
import type { DevConsoleConfig, GraphProvider, LoginProvider } from './types';
/**
 * LOCAL-DEV-ONLY console. Three routes, all behind {@link DevConsoleGuard} (404s
 * when disabled):
 *   GET  /dev        → the single-file page (config injected, CSP relaxed for inline)
 *   GET  /dev/graph  → your GraphProvider's snapshot
 *   POST /dev/login  → your LoginProvider mints a real session
 */
export declare class DevConsoleController {
    private readonly config;
    private readonly graph;
    private readonly auth;
    constructor(config: DevConsoleConfig, graph: GraphProvider, auth: LoginProvider);
    page(res: Response): Promise<void>;
    graphSnapshot(): Promise<import("./types").DevGraph>;
    login(body: unknown, req: Request, res: Response): Promise<unknown>;
    /** The non-secret subset of config serialized into the page. */
    private clientConfig;
}
