"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DevConsoleModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DevConsoleModule = void 0;
const common_1 = require("@nestjs/common");
const dev_console_controller_1 = require("./dev-console.controller");
const dev_console_enabled_1 = require("./dev-console.enabled");
const dev_console_guard_1 = require("./dev-console.guard");
const tokens_1 = require("./tokens");
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
let DevConsoleModule = DevConsoleModule_1 = class DevConsoleModule {
    static forRoot(options) {
        if (!(0, dev_console_enabled_1.resolveEnabled)(options.config)) {
            return { module: DevConsoleModule_1 };
        }
        return {
            module: DevConsoleModule_1,
            imports: options.imports ?? [],
            controllers: [dev_console_controller_1.DevConsoleController],
            providers: [
                options.graphProvider,
                options.loginProvider,
                { provide: tokens_1.DEV_CONSOLE_CONFIG, useValue: options.config },
                { provide: tokens_1.DEV_CONSOLE_GRAPH_PROVIDER, useExisting: options.graphProvider },
                { provide: tokens_1.DEV_CONSOLE_LOGIN_PROVIDER, useExisting: options.loginProvider },
                dev_console_guard_1.DevConsoleGuard,
            ],
        };
    }
};
exports.DevConsoleModule = DevConsoleModule;
exports.DevConsoleModule = DevConsoleModule = DevConsoleModule_1 = __decorate([
    (0, common_1.Module)({})
], DevConsoleModule);
