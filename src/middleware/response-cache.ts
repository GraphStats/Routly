import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import { Cache } from '../features/cache';

export interface ResponseCacheOptions {
    ttl?: number; // Time to live in milliseconds
    keyGenerator?: (req: Request) => string;
    shouldCache?: (req: Request, res: Response) => boolean;
    cache?: Cache;
    varyByQuery?: boolean;
    varyByHeaders?: string[];
}

interface CachedResponse {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: any;
    timestamp: number;
}

/**
 * Response caching middleware
import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import { Cache } from '../features/cache';

export interface ResponseCacheOptions {
    ttl?: number; // Time to live in milliseconds
    keyGenerator?: (req: Request) => string;
    shouldCache?: (req: Request, res: Response) => boolean;
    cache?: Cache;
    varyByQuery?: boolean;
    varyByHeaders?: string[];
}

interface CachedResponse {
    statusCode: number;
    headers: Record<string, string | string[]>;
    body: any;
    timestamp: number;
}

/**
 * Response caching middleware
 * Caches responses in memory or external store
 */
export function responseCache(options: ResponseCacheOptions = {}): Handler {
    const {
        ttl = 300000, // 5 minutes default
        keyGenerator = (req) => {
            const path = req.path || req.url || '/';
            let key = `${req.method}:${path}`;
            if (varyByQuery) {
                key += `:${JSON.stringify(req.query)}`;
            }
            if (varyByHeaders && varyByHeaders.length > 0) {
                const headerValues = varyByHeaders.map(h => req.headers[h.toLowerCase()]).join(':');
                key += `:${headerValues}`;
            }
            return key;
        },
        shouldCache = (req, res) => {
            // Only cache GET requests with 200 status by default
            return req.method === 'GET' && res.statusCode === 200;
        },
        cache = new Cache(),
        varyByQuery = true,
        varyByHeaders = []
    } = options;

    return async (req: Request, res: Response, next: Function) => {
        // Only attempt to use cache for GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = keyGenerator(req);

        // Check cache
        const cached = cache.get<CachedResponse>(key);
        if (cached) {
            // Serve from cache
            res.statusCode = cached.statusCode;
            Object.entries(cached.headers).forEach(([name, value]) => {
                res.setHeader(name, value);
            });
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Age', Math.floor((Date.now() - cached.timestamp) / 1000).toString());

            if (typeof cached.body === 'string') {
                res.send(cached.body);
                return;
            } else {
                res.json(cached.body);
                return;
            }
        }

        // Cache miss - intercept response
        res.setHeader('X-Cache', 'MISS');

        const originalJson = res.json.bind(res);
        const originalSend = res.send.bind(res);

        let responseCached = false;

        const cacheResponse = (body: any) => {
            if (!responseCached && shouldCache(req, res)) {
                const cachedData: CachedResponse = {
                    statusCode: res.statusCode,
                    headers: { ...res.getHeaders() } as Record<string, string | string[]>,
                    body,
                    timestamp: Date.now()
                };
                cache.set(key, cachedData, ttl);
                responseCached = true;
            }
        };

        res.json = function (body: any): Response {
            cacheResponse(body);
            originalJson(body);
            return this;
        };

        res.send = function (body: any): Response {
            cacheResponse(body);
            originalSend(body);
            return this;
        };

        next();
    };
}

/**
 * Middleware to invalidate cache for specific patterns
 */
export function invalidateCache(pattern: string | RegExp, cache?: Cache): Handler {
    const cacheInstance = cache || new Cache();

    return async (req: Request, res: Response, next: Function) => {
        // Invalidate matching cache entries
        const keys = cacheInstance.keys();
        for (const key of keys) {
            if (typeof pattern === 'string' && key.includes(pattern)) {
                cacheInstance.delete(key);
            } else if (pattern instanceof RegExp && pattern.test(key)) {
                cacheInstance.delete(key);
            }
        }
        next();
    };
}
