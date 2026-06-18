import { DynamicModule, Type } from '@nestjs/common';
import type { DevConsoleConfig, GraphProvider, LoginProvider } from './types';
export interface DevConsoleModuleOptions {
    config: DevConsoleConfig;
    /** @Injectable() class implementing GraphProvider. Resolved from `imports`. */
    graphProvider: Type<GraphProvider>;
    /** @Injectable() class implementing LoginProvider. Resolved from `imports`. */
    loginProvider: Type<LoginProvider>;
    /** Modules exporting the deps your providers inject (ORM, auth service, …). */
    imports?: DynamicModule['imports'];
}
/**
 * Mounts the dev console at `/<globalPrefix>/dev`.
 *
 *   DevConsoleModule.forRoot({
 *     config: { apps: {...}, roles: {...} },
 *     imports: [PrismaModule, AuthModule],
 *     graphProvider: MyGraphProvider,
 *     loginProvider: MyLoginProvider,
 *   })
 *
 * When the {@link resolveEnabled default-deny gate} says off (e.g. production),
 * forRoot returns an EMPTY module — the controller and routes are never even
 * registered. The guard is a second, request-time check on top of that.
 */
export declare class DevConsoleModule {
    static forRoot(options: DevConsoleModuleOptions): DynamicModule;
}
