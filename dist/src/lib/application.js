"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Routly = void 0;
const http = __importStar(require("http"));
// @ts-ignore
const config = require('../../routly.config.js');
const router_1 = require("./router");
const response_1 = require("./response");
const route_group_1 = require("./route-group");
const request_enhancer_1 = require("./request-enhancer");
const route_builder_1 = require("./route-builder");
class Routly {
    /**
     * Access the global configuration.
     */
    static get config() {
        return config;
    }
    constructor() {
        this.router = new router_1.Router();
    }
    use(path, handler) {
        this.router.use(path, handler);
    }
    get(path, handler) {
        this.router.add('GET', path, handler);
    }
    post(path, handler) {
        this.router.add('POST', path, handler);
    }
    put(path, handler) {
        this.router.add('PUT', path, handler);
    }
    delete(path, handler) {
        this.router.add('DELETE', path, handler);
    }
    patch(path, handler) {
        this.router.add('PATCH', path, handler);
    }
    options(path, handler) {
        this.router.add('OPTIONS', path, handler);
    }
    group(prefix, callback) {
        const group = new route_group_1.RouteGroup(prefix, this.router);
        callback(group);
    }
    /**
     * Builder-style API: Define routes with method chaining
     * Example: app.route('/users').get(handler).post(handler)
     */
    route(path) {
        return new route_builder_1.RouteBuilder(path, this.router);
    }
    /**
     * Modern map-style API: Define multiple routes at once
     * Example: app.routes({ 'GET /': handler, 'POST /users': handler })
     */
    routes(routeMap) {
        for (const [key, handler] of Object.entries(routeMap)) {
            const [method, ...pathParts] = key.trim().split(/\s+/);
            const path = pathParts.join(' ') || '/';
            const upperMethod = method.toUpperCase();
            if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'].includes(upperMethod)) {
                this.router.add(upperMethod, path, handler);
            }
            else {
                throw new Error(`Invalid HTTP method: ${method}. Expected format: 'METHOD /path'`);
            }
        }
    }
    /**
     * Modern alias for listen() - Start the server
     */
    /**
     * Start the server using configuration defaults if parameters are omitted.
     */
    start(port, callback) {
        this.listen(port, callback);
    }
    /**
     * Listen on the configured port/host. If a port is provided it overrides the config.
     */
    listen(port, callback) {
        this.server = http.createServer((req, res) => {
            // Enhance request and response
            const enhancedReq = (0, request_enhancer_1.enhanceRequest)(req);
            // Parse URL and Query
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            enhancedReq.query = Object.fromEntries(url.searchParams);
            enhancedReq.params = {};
            // Override req.url to be just the pathname for routing
            // We need to be careful not to break original url if needed, but for routing pathname is key.
            Object.defineProperty(enhancedReq, 'path', { value: url.pathname });
            const enhancedRes = (0, response_1.enhanceResponse)(res);
            this.router.handle(enhancedReq, enhancedRes, (err) => {
                if (err) {
                    enhancedRes.statusCode = 500;
                    enhancedRes.end('Internal Server Error');
                    console.error(err);
                    return;
                }
                // Default 404 handler if no route matched
                enhancedRes.statusCode = 404;
                enhancedRes.end('Cannot ' + req.method + ' ' + req.url);
            });
        });
        // Determine port and host from config if not provided
        const listenPort = port ?? config.port;
        const host = config.host ?? undefined;
        this.server.listen(listenPort, host, callback);
        return this.server;
    }
}
exports.Routly = Routly;
