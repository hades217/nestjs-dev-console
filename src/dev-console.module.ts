import { DynamicModule, Module, Type } from '@nestjs/common';

import { DevConsoleController } from './dev-console.controller';
import { resolveEnabled } from './dev-console.enabled';
import { DevConsoleGuard } from './dev-console.guard';
import {
  DEV_CONSOLE_CONFIG,
  DEV_CONSOLE_GRAPH_PROVIDER,
  DEV_CONSOLE_LOGIN_PROVIDER,
} from './tokens';
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
@Module({})
export class DevConsoleModule {
  static forRoot(options: DevConsoleModuleOptions): DynamicModule {
    if (!resolveEnabled(options.config)) {
      return { module: DevConsoleModule };
    }

    return {
      module: DevConsoleModule,
      imports: options.imports ?? [],
      controllers: [DevConsoleController],
      providers: [
        options.graphProvider,
        options.loginProvider,
        { provide: DEV_CONSOLE_CONFIG, useValue: options.config },
        { provide: DEV_CONSOLE_GRAPH_PROVIDER, useExisting: options.graphProvider },
        { provide: DEV_CONSOLE_LOGIN_PROVIDER, useExisting: options.loginProvider },
        DevConsoleGuard,
      ],
    };
  }
}
