# @airbotix/nestjs-dev-console

A **local-dev-only impersonation console** for NestJS. Mount one module and get a
page at `/dev` that renders your users/entities as a role map and gives every node
a one-click **“Login as”** button — it mints a *real* session (your normal login
machinery) and deep-links into the right frontend.

It composes a few well-known patterns into one screen:

- **User impersonation** (“Login as” / “act as” / “sudo”) — the core.
- **Persona / account switcher** — jump between seeded test identities.
- **Fixture explorer** — your seed data drawn as an entity-relationship graph.
- **Local dev dashboard** — health dots + “this app is down, run X” hints.

> Think Django’s *login-as* or `laravel-impersonate`, but cross-app, visual, and
> framework-native — with a hardened, default-deny gate so it can never ship to prod.

---

## ⚠️ Security model — read this first

`POST /dev/login` mints a session for **any** identity by id. That is a **total auth
bypass**. The whole package is built around making sure it is *unreachable* anywhere
that isn’t your laptop:

1. **NODE_ENV allowlist** — only `development` or `test` enable it. Production, a
   typo, or *unset* NODE_ENV all evaluate to **off** (it’s an allowlist, not
   `!== 'production'`, so an unset env can’t leave a hole).
2. **An affirmative dev signal** — proof this isn’t a real deployment: insecure
   cookies (plain-http localhost), an explicit `DEV_CONSOLE_ENABLED=true`, or a
   `devSignal` you pass (e.g. “no real mailer key configured”).
3. **Kill switch** — `DEV_CONSOLE_ENABLED=false` overrides everything.
4. **Two enforcement layers** — when disabled, `forRoot()` registers **no
   controller at all**, and a request-time **guard** also re-checks and returns
   **404** (not 403 — the endpoint is indistinguishable from “doesn’t exist”).

You should *still* never expose your dev backend publicly. This package is defence
in depth, not a license to run dev mode on the internet.

---

## Install

```bash
npm i -D @airbotix/nestjs-dev-console
```

Peer deps: `@nestjs/common`, `@nestjs/core` (v10 or v11).

## Quick start

Implement two adapters, then register the module.

```ts
// graph.provider.ts — read YOUR db, return the role graph
import { Injectable } from '@nestjs/common';
import type { GraphProvider, DevGraph } from '@airbotix/nestjs-dev-console';

@Injectable()
export class MyGraphProvider implements GraphProvider {
  constructor(private readonly prisma: PrismaService) {}
  async buildGraph(): Promise<DevGraph> {
    /* …query users/orgs/etc and shape them (see “Graph contract” below)… */
  }
}
```

```ts
// login.provider.ts — mint a REAL session (reuse your normal login path)
import { Injectable } from '@nestjs/common';
import type { LoginProvider } from '@airbotix/nestjs-dev-console';

@Injectable()
export class MyLoginProvider implements LoginProvider {
  constructor(private readonly auth: AuthService) {}
  login(body: { kind: string; id: string }, ctx) {
    return body.kind === 'kid'
      ? this.auth.devLoginKid(body.id, ctx.res)
      : this.auth.devLoginUser(body.id, ctx.res);
  }
}
```

```ts
// app.module.ts
import { DevConsoleModule } from '@airbotix/nestjs-dev-console';

@Module({
  imports: [
    DevConsoleModule.forRoot({
      imports: [PrismaModule, AuthModule], // modules your providers inject from
      graphProvider: MyGraphProvider,
      loginProvider: MyLoginProvider,
      config: {
        branding: { title: 'Acme Dev Console', logo: '🛠' },
        // affirmative non-prod signal (one of these / insecure cookies / NODE_ENV opt-in)
        devSignal: !process.env.SENDGRID_API_KEY,
        apps: {
          web:   { url: 'http://localhost:5173', label: 'web', startCmd: 'cd web && npm run dev' },
          admin: { url: 'http://localhost:5174', label: 'admin', startCmd: 'cd admin && npm run dev' },
        },
        roles: {
          super_admin: { color: '#a78bfa', icon: '👑', label: 'super admin' },
          user:        { color: '#fbbf24', icon: '👤', label: 'user' },
          org:         { color: '#f0a868', icon: '🏢', label: 'org' },
        },
        layout: {
          ownershipHead: { title: '🏢 Orgs', sub: 'web' },
          deliveryHead:  { title: '🚚 Delivery', sub: 'admin' },
          seedHint: 'npm run seed',
          startAllCmd: 'bash scripts/dev-up.sh',
        },
      },
    }),
  ],
})
export class AppModule {}
```

Open **`http://localhost:<api-port>/dev`** (respects your `setGlobalPrefix`, e.g.
`/api/dev`). Visit it without a trailing slash.

## Graph contract

`buildGraph()` returns a `DevGraph`. Layout: a top **platform** row, two tree
columns — **ownership** (owner → members) and **delivery** (provider → items) —
plus **unaffiliated** nodes, all wired by **edges**. Map your domain onto it
(family→members & teacher→classes, or org→users & vendor→orders, …).

```ts
interface DevGraph {
  env: { node_env: string };
  apps: Record<string, string>;          // app key → base url (echoed to client)
  platform: DevGraphNode[];
  ownership: { owner: DevGraphNode; members: DevGraphNode[] }[];
  delivery:  { provider: DevGraphNode | null; items: DevGraphNode[] }[];
  unaffiliated: DevGraphNode[];
  edges: { from: string; to: string; type: 'rel' | 'authority'; label?: string }[];
}

interface DevGraphNode {
  id: string;
  role: string;                          // key into config.roles (icon + accent)
  name: string;
  tag: string;                           // small uppercase sub-label
  email?: string;
  info?: { k: string; v: string }[];     // rows in the card body
  login?: { kind: string; id: string; app: string; path: string };
}
```

A node with a `login` descriptor gets a button; `kind`/`id` are POSTed to
`/dev/login` and handed verbatim to your `LoginProvider`; `app` + `path` decide
which frontend opens afterward.

## FAQ

**Why does logging in on one app affect another locally?**
Sessions usually live in a cookie scoped to the **backend** host (`localhost`),
and cookies ignore port — so every localhost frontend that talks to the same
backend shares one session. That’s expected locally (it’s what lets this console
deep-link you in). In production your apps are different hosts, so they don’t
collide. This console doesn’t use `localStorage` for auth at all.

**Does it run in production?** No — see the security model. `forRoot()` returns an
empty module there and the route 404s.

**My app uses a Bearer token in `localStorage`, not a shared cookie — how does
deep-link login work?** Return `{ openUrl }` from your `LoginProvider`: the page
opens that URL instead of `apps[app].url + path`, so the freshly-minted token can
ride in the URL. Add a tiny dev-only frontend route that reads it and persists it
the way your normal login does:

```ts
// login.provider.ts
login(body) {                                  // body = { kind, id, app, path }
  const token = this.auth.mintToken(body.id);  // your real login machinery
  const base = this.webBaseFor(body.app);      // e.g. http://localhost:8000
  return { openUrl: `${base}/dev-login?token=${token}&redirect=${body.path || '/'}` };
}
```
```ts
// frontend: /dev-login (dev-gated) — store token like normal login, then redirect
localStorage.setItem('token', params.get('token'));
// hydrate auth state (re-fetch current user), then router.push(params.get('redirect'))
```

## License

MIT
