import { Handler, NextFunction } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';

export interface ProxyOptions {
    target: string;
    changeOrigin?: boolean;
    preserveHostHeader?: boolean;
    followRedirects?: boolean;
    timeout?: number;
    onProxyReq?: (proxyReq: http.ClientRequest, req: Request) => void;
    onProxyRes?: (proxyRes: http.IncomingMessage, req: Request, res: Response) => void;
    onError?: (err: Error, req: Request, res: Response) => void;
    pathRewrite?: (path: string) => string;
    headers?: Record<string, string>;
}

/**
 * Proxy/forwarding middleware
 * Forward requests to other servers
 */
export function proxy(options: ProxyOptions): Handler {
    const {
        target,
        changeOrigin = true,
        preserveHostHeader = false,
        followRedirects = false,
        timeout: timeoutMs = 30000,
        onProxyReq,
        onProxyRes,
        onError = (err, req, res) => {
            if (!res.headersSent) {
                res.status(502).json({
                    error: 'Bad Gateway',
                    message: 'Error connecting to upstream server',
                    details: err.message
                });
            }
        },
        pathRewrite,
        headers = {}
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const targetUrl = new URL(target);
            const isHttps = targetUrl.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            // Rewrite path if needed
            let path = req.url || '/';
            if (pathRewrite) {
                path = pathRewrite(path);
            }

            // Prepare proxy request options
            const proxyOptions: http.RequestOptions = {
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
                    (proxyOptions.headers as any)['host'] = targetUrl.host;
                } else if (!preserveHostHeader) {
                    delete (proxyOptions.headers as any)['host'];
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
                    delete (proxyOptions.headers as any)[header];
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
                (req as any).pipe(proxyReq);
            } else {
                proxyReq.end();
            }

        } catch (err) {
            onError(err as Error, req, res);
        }
    };
}

/**
 * Load balancer middleware
 * Distributes requests across multiple targets
 */
export function loadBalancer(targets: string[], strategy: 'round-robin' | 'random' = 'round-robin'): Handler {
    let currentIndex = 0;

    return async (req: Request, res: Response, next: NextFunction) => {
        let target: string;

        if (strategy === 'round-robin') {
            target = targets[currentIndex];
            currentIndex = (currentIndex + 1) % targets.length;
        } else {
            target = targets[Math.floor(Math.random() * targets.length)];
        }

        const proxyMiddleware = proxy({ target });
        return proxyMiddleware(req, res, next);
    };
}
