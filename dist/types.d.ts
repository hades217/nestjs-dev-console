import type { Request, Response } from 'express';
/** Where a node logs into. `app` is a key of {@link DevConsoleConfig.apps}. */
export interface DevLoginDescriptor {
    /** Opaque to this package — your LoginProvider decides what it means (e.g. 'user' | 'kid'). */
    kind: string;
    id: string;
    app: string;
    /** Path appended to the app URL after login (e.g. '/portal'). */
    path: string;
}
export interface DevGraphNode {
    id: string;
    /** Drives icon/accent lookup in {@link DevConsoleConfig.roles}. */
    role: string;
    name: string;
    /** Small uppercase sub-label, e.g. "super_admin" or "family · TEST01". */
    tag: string;
    email?: string;
    /** Key/value rows shown in the card body. */
    info?: {
        k: string;
        v: string;
    }[];
    login?: DevLoginDescriptor;
}
export interface DevGraphEdge {
    from: string;
    to: string;
    /** 'rel' = solid (membership/enrollment); 'authority' = dashed (manages). */
    type: 'rel' | 'authority';
    label?: string;
}
/** An owner node and the members it controls (left column). */
export interface DevOwnershipGroup {
    owner: DevGraphNode;
    members: DevGraphNode[];
}
/** A provider node and the items it delivers (right column). */
export interface DevDeliveryGroup {
    provider: DevGraphNode | null;
    items: DevGraphNode[];
}
export interface DevGraph {
    env: {
        node_env: string;
    };
    /** App key → base URL. Echoed to the client for deep-links + health pings. */
    apps: Record<string, string>;
    /** Top row — platform staff / privileged accounts. */
    platform: DevGraphNode[];
    /** Left column — ownership trees. */
    ownership: DevOwnershipGroup[];
    /** Right column — delivery trees. */
    delivery: DevDeliveryGroup[];
    /** Nodes with no tree (e.g. signed-up-but-not-onboarded). */
    unaffiliated: DevGraphNode[];
    edges: DevGraphEdge[];
}
/** Reads your DB and returns the role graph. Injected via DEV_CONSOLE_GRAPH_PROVIDER. */
export interface GraphProvider {
    buildGraph(): Promise<DevGraph> | DevGraph;
}
/** What the page POSTs to `/dev/login`. `app`/`path` echo the clicked node's
 *  login descriptor so a token-based provider can build a deep-link itself. */
export interface DevLoginBody {
    kind: string;
    id: string;
    /** The clicked node's target app key (key of {@link DevConsoleConfig.apps}). */
    app?: string;
    /** The clicked node's post-login path. */
    path?: string;
}
/**
 * Mints a REAL session for the given identity and sets it on the response —
 * exactly what your normal login does. Two auth styles are supported:
 *
 *  - **Cookie/header session** (the default): set the cookie on `ctx.res`; the
 *    page then opens `apps[app].url + path` and the shared-host cookie logs you in.
 *  - **Token-in-URL** (Bearer/localStorage apps with no shared cookie): return an
 *    object `{ openUrl: string }` — a fully-formed URL (e.g.
 *    `http://localhost:8000/dev-login?token=…`). The page opens THAT instead of
 *    `base + path`, so the freshly-minted token can ride along in the URL.
 *
 * This is a total auth bypass; it only ever runs behind the default-deny gate.
 * Injected via DEV_CONSOLE_LOGIN_PROVIDER.
 */
export interface LoginProvider {
    login(body: DevLoginBody, ctx: {
        req: Request;
        res: Response;
    }): Promise<DevLoginResult> | DevLoginResult;
}
/** A provider may return anything; an `openUrl` string overrides the deep-link. */
export type DevLoginResult = {
    openUrl?: string;
} | unknown;
export interface DevConsoleRole {
    /** Accent hex, e.g. '#a78bfa'. */
    color: string;
    /** Emoji shown on the card + legend. */
    icon: string;
    /** Legend label. */
    label: string;
}
export interface DevConsoleApp {
    /** Base URL, e.g. 'http://localhost:4321'. */
    url: string;
    /** Human label, e.g. 'app (parent / kid)'. */
    label: string;
    /** Shell command to start it, shown when the app is down. */
    startCmd?: string;
}
export interface DevConsoleBranding {
    title?: string;
    /** Pill text, default '● LOCAL DEV ONLY'. */
    pill?: string;
    /** Logo glyph/emoji. */
    logo?: string;
}
export interface DevConsoleLayout {
    /** Left-column heading. */
    ownershipHead?: {
        title: string;
        sub: string;
    };
    /** Right-column heading. */
    deliveryHead?: {
        title: string;
        sub: string;
    };
    footerNote?: string;
    /** Command shown in the empty state when the DB has no data. */
    seedHint?: string;
    /** Command shown to start every app at once. */
    startAllCmd?: string;
}
export interface DevConsoleConfig {
    /** App key → {url,label,startCmd}. Keys must match DevLoginDescriptor.app. */
    apps: Record<string, DevConsoleApp>;
    /** Role key → {color,icon,label}. Keys must match DevGraphNode.role. */
    roles?: Record<string, DevConsoleRole>;
    branding?: DevConsoleBranding;
    layout?: DevConsoleLayout;
    /**
     * Hard override of the enable decision. A boolean forces it; a function is
     * evaluated at request time. When omitted, the default-deny gate decides
     * (see {@link devConsoleEnabled}).
     */
    enabled?: boolean | (() => boolean);
    /**
     * Affirmative "this is not production" signal beyond NODE_ENV — e.g. pass
     * `!process.env.SENDGRID_API_KEY` (no real mailer ⇒ not prod). One of:
     * explicit opt-in, insecure cookies, or this, must be true to enable.
     */
    devSignal?: boolean;
}
/** Subset of {@link DevConsoleConfig} sent to the browser (no functions). */
export interface DevConsoleClientConfig {
    env: {
        node_env: string;
    };
    branding: DevConsoleBranding;
    roles: Record<string, DevConsoleRole>;
    apps: Record<string, DevConsoleApp>;
    layout: DevConsoleLayout;
}
