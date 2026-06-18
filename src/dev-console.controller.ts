import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { DevConsoleGuard } from './dev-console.guard';
import {
  DEV_CONSOLE_CONFIG,
  DEV_CONSOLE_GRAPH_PROVIDER,
  DEV_CONSOLE_LOGIN_PROVIDER,
} from './tokens';
import type {
  DevConsoleClientConfig,
  DevConsoleConfig,
  GraphProvider,
  LoginProvider,
} from './types';

const CONFIG_PLACEHOLDER = '<!--DEVCONSOLE_CONFIG-->';

/**
 * LOCAL-DEV-ONLY console. Three routes, all behind {@link DevConsoleGuard} (404s
 * when disabled):
 *   GET  /dev        → the single-file page (config injected, CSP relaxed for inline)
 *   GET  /dev/graph  → your GraphProvider's snapshot
 *   POST /dev/login  → your LoginProvider mints a real session
 */
@UseGuards(DevConsoleGuard)
@Controller('dev')
export class DevConsoleController {
  constructor(
    @Inject(DEV_CONSOLE_CONFIG) private readonly config: DevConsoleConfig,
    @Inject(DEV_CONSOLE_GRAPH_PROVIDER) private readonly graph: GraphProvider,
    @Inject(DEV_CONSOLE_LOGIN_PROVIDER) private readonly auth: LoginProvider,
  ) {}

  @Get()
  async page(@Res() res: Response): Promise<void> {
    const html = await readFile(join(__dirname, 'dev-console.html'), 'utf8');
    const client = this.clientConfig();
    const injected = html.replace(
      CONFIG_PLACEHOLDER,
      `<script>window.__DEVCONSOLE__=${safeJson(client)};</script>`,
    );

    // The host app's default CSP is usually `script-src 'self'`, which blocks
    // this page's inline <script>/<style>. Relax CSP for THIS dev-only route only
    // (never shipped to prod — the route 404s there). connect-src also allows the
    // app origins so the page's health pings work.
    const connect = ["'self'", ...Object.values(this.config.apps).map((a) => a.url)].join(' ');
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connect}`,
    );
    res.type('html').send(injected);
  }

  @Get('graph')
  async graphSnapshot() {
    return this.graph.buildGraph();
  }

  @Post('login')
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const parsed = parseLoginBody(body);
    return this.auth.login(parsed, { req, res });
  }

  /** The non-secret subset of config serialized into the page. */
  private clientConfig(): DevConsoleClientConfig {
    return {
      env: { node_env: process.env.NODE_ENV ?? 'unknown' },
      branding: this.config.branding ?? {},
      roles: this.config.roles ?? {},
      apps: this.config.apps,
      layout: this.config.layout ?? {},
    };
  }
}

/** Validates `{ kind, id }` without pulling in a validation framework. */
function parseLoginBody(body: unknown): { kind: string; id: string } {
  if (typeof body !== 'object' || body === null) {
    throw new BadRequestException('body must be an object');
  }
  const { kind, id } = body as Record<string, unknown>;
  if (typeof kind !== 'string' || kind.length < 1 || kind.length > 32) {
    throw new BadRequestException('kind must be a 1–32 char string');
  }
  if (typeof id !== 'string' || id.length < 1 || id.length > 64) {
    throw new BadRequestException('id must be a 1–64 char string');
  }
  return { kind, id };
}

/** JSON for inline <script>: escape `<` so a `</script>` in data can't break out. */
function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
