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
exports.proxy = proxy;
exports.loadBalancer = loadBalancer;
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
/**
 * Proxy/forwarding middleware
 * Forward requests to other servers
 */
function proxy(options) {
    const { target, changeOrigin = true, preserveHostHeader = false, followRedirects = false, timeout: timeoutMs = 30000, onProxyReq, onProxyRes, onError = (err, req, res) => {
        if (!res.headersSent) {
            res.status(502).json({
                error: 'Bad Gateway',
                message: 'Error connecting to upstream server',
                details: err.message
            });
        }
    }, pathRewrite, headers = {} } = options;
    return async (req, res, next) => {
        try {
            const targetUrl = new url_1.URL(target);
            const isHttps = targetUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;
            // Rewrite path if needed
            let path = req.url || '/';
            if (pathRewrite) {
                path = pathRewrite(path);
            }
            // Prepare proxy request options
            const proxyOptions = {
                hostname: targetUrl.hostname,
                port: targetUrl.port || (isHttps ? 443 : 80),
                path: path,
                method: req.method,
                headers: {
                    ...req.headers,
                    ...headers
                },
                timeout: timeoutMs
            };
            // Handle origin and host headers
            if (proxyOptions.headers) {
                if (changeOrigin) {
                    proxyOptions.headers['host'] = targetUrl.host;
                }
                else if (!preserveHostHeader) {
                    delete proxyOptions.headers['host'];
                }
            }
            // Remove hop-by-hop headers
            const hopByHopHeaders = [
                'connection',
                'keep-alive',
                'proxy-authenticate',
                'proxy-authorization',
                'te',
                'trailers',
                'transfer-encoding',
                'upgrade'
            ];
            if (proxyOptions.headers) {
                hopByHopHeaders.forEach(header => {
                    delete proxyOptions.headers[header];
                });
            }
            // Create proxy request
            const proxyReq = httpModule.request(proxyOptions, (proxyRes) => {
                // Handle redirects
                if (followRedirects && proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
                    const location = proxyRes.headers.location;
                    if (location) {
                        return res.redirect(location, proxyRes.statusCode);
                    }
                }
                // Call custom handler
                if (onProxyRes) {
                    onProxyRes(proxyRes, req, res);
                }
                if (res.writableEnded) {
                    return;
                }
                // Copy status code and headers if not already sent
                if (!res.headersSent) {
                    res.statusCode = proxyRes.statusCode || 200;
                    // Copy headers
                    Object.entries(proxyRes.headers).forEach(([key, value]) => {
                        if (value !== undefined) {
                            res.setHeader(key, value);
                        }
                    });
                    // Add proxy header
                    res.setHeader('X-Proxied-By', 'Routly');
                }
                // Pipe response
                proxyRes.pipe(res);
            });
            // Handle errors
            proxyReq.on('error', (err) => {
                onError(err, req, res);
            });
            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                onError(new Error('Proxy request timeout'), req, res);
            });
            // Call custom handler
            if (onProxyReq) {
                onProxyReq(proxyReq, req);
            }
            // Pipe request body
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                req.pipe(proxyReq);
            }
            else {
                proxyReq.end();
            }
        }
        catch (err) {
            onError(err, req, res);
        }
    };
}
/**
 * Load balancer middleware
 * Distributes requests across multiple targets
 */
function loadBalancer(targets, strategy = 'round-robin') {
    let currentIndex = 0;
    return async (req, res, next) => {
        let target;
        if (strategy === 'round-robin') {
            target = targets[currentIndex];
            currentIndex = (currentIndex + 1) % targets.length;
        }
        else {
            target = targets[Math.floor(Math.random() * targets.length)];
        }
        const proxyMiddleware = proxy({ target });
        return proxyMiddleware(req, res, next);
    };
}
