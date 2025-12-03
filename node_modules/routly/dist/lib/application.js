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
const router_1 = require("./router");
const response_1 = require("./response");
const route_group_1 = require("./route-group");
const request_enhancer_1 = require("./request-enhancer");
class Routly {
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
    listen(port, callback) {
        const server = http.createServer((req, res) => {
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
        server.listen(port, callback);
    }
}
exports.Routly = Routly;
