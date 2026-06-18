import { Injectable } from '@nestjs/common';

import { DevConsoleController } from './dev-console.controller';
import { DevConsoleModule } from './dev-console.module';
import type { DevConsoleConfig, DevGraph, GraphProvider, LoginProvider } from './types';

@Injectable()
class FakeGraph implements GraphProvider {
  buildGraph(): DevGraph {
    return { env: { node_env: 'test' }, apps: {}, platform: [], ownership: [], delivery: [], unaffiliated: [], edges: [] };
  }
}
@Injectable()
class FakeLogin implements LoginProvider {
  login() {
    return { ok: true };
  }
}

const base: Omit<Parameters<typeof DevConsoleModule.forRoot>[0], 'config'> = {
  graphProvider: FakeGraph,
  loginProvider: FakeLogin,
};

describe('DevConsoleModule.forRoot', () => {
  it('registers the controller when enabled', () => {
    const mod = DevConsoleModule.forRoot({ ...base, config: { apps: {}, enabled: true } as DevConsoleConfig });
    expect(mod.controllers).toEqual([DevConsoleController]);
    expect(mod.providers && mod.providers.length).toBeGreaterThan(0);
  });

  it('registers NOTHING when disabled (no controller, no routes)', () => {
    const mod = DevConsoleModule.forRoot({ ...base, config: { apps: {}, enabled: false } as DevConsoleConfig });
    expect(mod.controllers).toBeUndefined();
    expect(mod.providers).toBeUndefined();
  });
});
