import { BadRequestException } from '@nestjs/common';

import { DevConsoleController } from './dev-console.controller';
import type { DevConsoleConfig, DevGraph, GraphProvider, LoginProvider } from './types';

const config: DevConsoleConfig = {
  apps: { web: { url: 'http://localhost:5173', label: 'web' } },
  roles: { user: { color: '#fff', icon: '👤', label: 'user' } },
  branding: { title: 'Acme Dev' },
  enabled: true,
};

const graph: GraphProvider = {
  buildGraph: (): DevGraph => ({
    env: { node_env: 'test' },
    apps: { web: 'http://localhost:5173' },
    platform: [],
    ownership: [],
    delivery: [],
    unaffiliated: [],
    edges: [],
  }),
};

function fakeRes() {
  const headers: Record<string, string> = {};
  return {
    headers,
    body: undefined as unknown,
    setHeader(k: string, v: string) {
      headers[k] = v;
    },
    type() {
      return this;
    },
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe('DevConsoleController', () => {
  const login: jest.Mock = jest.fn(() => ({ ok: true }));
  const loginProvider: LoginProvider = { login };
  const ctrl = new DevConsoleController(config, graph, loginProvider);

  beforeEach(() => login.mockClear());

  it('GET /dev/graph returns the provider snapshot', async () => {
    const g = await ctrl.graphSnapshot();
    expect(g.apps.web).toBe('http://localhost:5173');
  });

  it('GET /dev injects the client config and relaxes CSP for app origins', async () => {
    const res = fakeRes();
    await ctrl.page(res as never);
    const html = String(res.body);
    expect(html).toContain('window.__DEVCONSOLE__=');
    expect(html).toContain('Acme Dev'); // branding made it into the injected config
    expect(html).not.toContain('<!--DEVCONSOLE_CONFIG-->'); // placeholder was replaced
    expect(res.headers['Content-Security-Policy']).toContain('http://localhost:5173');
    expect(res.headers['Content-Security-Policy']).toContain("script-src 'self' 'unsafe-inline'");
  });

  it('POST /dev/login validates the body, then delegates to the LoginProvider', async () => {
    const res = fakeRes();
    await ctrl.login({ kind: 'user', id: 'u1' }, {} as never, res as never);
    expect(login).toHaveBeenCalledWith(
      { kind: 'user', id: 'u1' },
      expect.objectContaining({ res }),
    );
  });

  it('POST /dev/login rejects a malformed body before touching auth', async () => {
    const res = fakeRes();
    await expect(ctrl.login({ id: 'u1' }, {} as never, res as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(login).not.toHaveBeenCalled();
  });
});
