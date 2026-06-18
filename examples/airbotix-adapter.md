# Example adapter — Airbotix platform-backend

How the original (airbotix) console maps onto the generic contract. Use it as a
template for your own `GraphProvider` / `LoginProvider`.

## Mapping

| Airbotix concept            | Generic slot                          |
|-----------------------------|---------------------------------------|
| super_admin / admin / teacher candidates | `platform[]`            |
| family → parents + kids     | `ownership[] { owner, members }`      |
| teacher → classes           | `delivery[] { provider, items }`      |
| parents/kids with no family | `unaffiliated[]`                      |
| enrollment, manages-authority | `edges[]` (`type: 'rel' \| 'authority'`) |
| airbotix-app / teacher-console / super-admin | `config.apps`        |

## LoginProvider (wraps the real auth service)

```ts
@Injectable()
export class AirbotixLoginProvider implements LoginProvider {
  constructor(private readonly auth: AuthService) {}
  login(body: { kind: string; id: string }, ctx: { req: Request; res: Response }) {
    const meta = requestMeta(ctx.req);
    return body.kind === 'kid'
      ? this.auth.devLoginKid(body.id, ctx.res, meta)   // real refresh-cookie machinery
      : this.auth.devLoginUser(body.id, ctx.res, meta);
  }
}
```

## GraphProvider (sketch — reads Prisma)

```ts
@Injectable()
export class AirbotixGraphProvider implements GraphProvider {
  constructor(private readonly prisma: PrismaService) {}

  async buildGraph(): Promise<DevGraph> {
    const [staff, families, teachers] = await Promise.all([/* …prisma queries… */]);
    const edges: DevGraphEdge[] = [];

    const platform = staff.map((u) => ({
      id: u.id, role: u.role, name: u.name ?? u.email, tag: u.role, email: u.email,
      login: { kind: 'user', id: u.id, app: 'super-admin', path: '' },
    }));

    const ownership = families.map((f) => ({
      owner: { id: f.id, role: 'family', name: f.name, tag: `family · ${f.code}` },
      members: [
        ...f.parents.map((p) => ({ id: p.id, role: 'parent', name: p.name, tag: 'parent',
          login: { kind: 'user', id: p.id, app: 'airbotix-app', path: '/portal' } })),
        ...f.kids.map((k) => ({ id: k.id, role: 'kid', name: k.name, tag: `kid · age ${k.age}`,
          login: { kind: 'kid', id: k.id, app: 'airbotix-app', path: '/learn' } })),
      ],
    }));

    const delivery = teachers.map((t) => ({
      provider: { id: t.id, role: 'teacher', name: t.name, tag: 'teacher',
        login: { kind: 'user', id: t.id, app: 'teacher-console', path: '' } },
      items: t.classes.map((c) => ({ id: c.id, role: 'class', name: c.title, tag: `class · ${c.code}` })),
    }));

    // enrollment edges: kid → class; authority edges: super_admin → family/class
    // …push into `edges`…

    return {
      env: { node_env: process.env.NODE_ENV ?? 'unknown' },
      apps: { 'airbotix-app': '…', 'teacher-console': '…', 'super-admin': '…' },
      platform, ownership, delivery, unaffiliated: [], edges,
    };
  }
}
```

## forRoot config

```ts
DevConsoleModule.forRoot({
  imports: [PrismaModule, AuthModule],
  graphProvider: AirbotixGraphProvider,
  loginProvider: AirbotixLoginProvider,
  config: {
    branding: { title: 'Airbotix Dev Console', logo: '🛠' },
    devSignal: !process.env.RESEND_API_KEY && !process.env.SENDGRID_API_KEY,
    apps: {
      'airbotix-app':    { url: process.env.DEV_CONSOLE_APP_URL ?? 'http://localhost:4321', label: 'app (parent / kid)', startCmd: 'cd airbotix-app && npm run dev' },
      'teacher-console': { url: process.env.DEV_CONSOLE_TEACHER_URL ?? 'http://localhost:4322', label: 'teacher-console', startCmd: 'cd teacher-console && npm run dev' },
      'super-admin':     { url: process.env.DEV_CONSOLE_ADMIN_URL ?? 'http://localhost:4323', label: 'super-admin', startCmd: 'cd super-admin && npm run dev' },
    },
    roles: {
      super_admin: { color: '#a78bfa', icon: '👑', label: 'super_admin' },
      admin:       { color: '#818cf8', icon: '🛡️', label: 'admin' },
      teacher:     { color: '#34d399', icon: '🎓', label: 'teacher' },
      parent:      { color: '#fbbf24', icon: '👤', label: 'parent' },
      kid:         { color: '#f472b6', icon: '🧒', label: 'kid' },
      class:       { color: '#38bdf8', icon: '📚', label: 'class' },
      family:      { color: '#f0a868', icon: '🏠', label: 'family' },
    },
    layout: {
      ownershipHead: { title: '🏠 Account · Family', sub: 'app · /portal + /learn' },
      deliveryHead:  { title: '🎓 Delivery', sub: 'teacher-console' },
      seedHint: 'npx ts-node prisma/seed-test.ts',
      startAllCmd: 'bash scripts/dev-up.sh',
    },
  },
});
```
