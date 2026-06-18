"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevConsoleController = void 0;
const common_1 = require("@nestjs/common");
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const dev_console_guard_1 = require("./dev-console.guard");
const tokens_1 = require("./tokens");
const CONFIG_PLACEHOLDER = '<!--DEVCONSOLE_CONFIG-->';
/**
 * LOCAL-DEV-ONLY console. Three routes, all behind {@link DevConsoleGuard} (404s
 * when disabled):
 *   GET  /dev        → the single-file page (config injected, CSP relaxed for inline)
 *   GET  /dev/graph  → your GraphProvider's snapshot
 *   POST /dev/login  → your LoginProvider mints a real session
 */
let DevConsoleController = class DevConsoleController {
    constructor(config, graph, auth) {
        this.config = config;
        this.graph = graph;
        this.auth = auth;
    }
    async page(res) {
        const html = await (0, promises_1.readFile)((0, node_path_1.join)(__dirname, 'dev-console.html'), 'utf8');
        const client = this.clientConfig();
        const injected = html.replace(CONFIG_PLACEHOLDER, `<script>window.__DEVCONSOLE__=${safeJson(client)};</script>`);
        // The host app's default CSP is usually `script-src 'self'`, which blocks
        // this page's inline <script>/<style>. Relax CSP for THIS dev-only route only
        // (never shipped to prod — the route 404s there). connect-src also allows the
        // app origins so the page's health pings work.
        const connect = ["'self'", ...Object.values(this.config.apps).map((a) => a.url)].join(' ');
        res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${connect}`);
        res.type('html').send(injected);
    }
    async graphSnapshot() {
        return this.graph.buildGraph();
    }
    async login(body, req, res) {
        const parsed = parseLoginBody(body);
        return this.auth.login(parsed, { req, res });
    }
    /** The non-secret subset of config serialized into the page. */
    clientConfig() {
        return {
            env: { node_env: process.env.NODE_ENV ?? 'unknown' },
            branding: this.config.branding ?? {},
            roles: this.config.roles ?? {},
            apps: this.config.apps,
            layout: this.config.layout ?? {},
        };
    }
};
exports.DevConsoleController = DevConsoleController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DevConsoleController.prototype, "page", null);
__decorate([
    (0, common_1.Get)('graph'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DevConsoleController.prototype, "graphSnapshot", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], DevConsoleController.prototype, "login", null);
exports.DevConsoleController = DevConsoleController = __decorate([
    (0, common_1.UseGuards)(dev_console_guard_1.DevConsoleGuard),
    (0, common_1.Controller)('dev'),
    __param(0, (0, common_1.Inject)(tokens_1.DEV_CONSOLE_CONFIG)),
    __param(1, (0, common_1.Inject)(tokens_1.DEV_CONSOLE_GRAPH_PROVIDER)),
    __param(2, (0, common_1.Inject)(tokens_1.DEV_CONSOLE_LOGIN_PROVIDER)),
    __metadata("design:paramtypes", [Object, Object, Object])
], DevConsoleController);
/** Validates `{ kind, id, app?, path? }` without pulling in a validation framework. */
function parseLoginBody(body) {
    if (typeof body !== 'object' || body === null) {
        throw new common_1.BadRequestException('body must be an object');
    }
    const { kind, id, app, path } = body;
    if (typeof kind !== 'string' || kind.length < 1 || kind.length > 32) {
        throw new common_1.BadRequestException('kind must be a 1–32 char string');
    }
    if (typeof id !== 'string' || id.length < 1 || id.length > 64) {
        throw new common_1.BadRequestException('id must be a 1–64 char string');
    }
    const out = { kind, id };
    if (typeof app === 'string' && app.length <= 64)
        out.app = app;
    if (typeof path === 'string' && path.length <= 256)
        out.path = path;
    return out;
}
/** JSON for inline <script>: escape `<` so a `</script>` in data can't break out. */
function safeJson(value) {
    return JSON.stringify(value).replace(/</g, '\\u003c');
}
