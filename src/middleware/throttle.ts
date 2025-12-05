import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';

export interface ThrottleOptions {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: Request) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    handler?: (req: Request, res: Response) => void;
}

interface ThrottleEntry {
    requests: number[];
    resetTime: number;
}

const store = new Map<string, ThrottleEntry>();

/**
 * Request throttling middleware with sliding window algorithm
 * More sophisticated than rate limiting - allows burst traffic
 */
export function throttle(options: ThrottleOptions = {}): Handler {
    const {
        windowMs = 60000, // 1 minute
        maxRequests = 100,
        keyGenerator = (req) => req.ip || 'unknown',
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        handler = (req, res) => {
            res.status(429).json({
                error: 'Too Many Requests',
                message: 'You have exceeded the request limit. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
    } = options;

    return async (req: Request, res: Response, next: Function) => {
        const key = keyGenerator(req);
        const now = Date.now();

        // Get or create entry
        let entry = store.get(key);
        if (!entry || now > entry.resetTime) {
            entry = {
                requests: [],
                resetTime: now + windowMs
            };
            store.set(key, entry);
        }

        // Remove old requests outside the window
        entry.requests = entry.requests.filter(time => now - time < windowMs);

        // Check if limit exceeded
        if (entry.requests.length >= maxRequests) {
            return handler(req, res);
        }

        // Track this request
        const originalEnd = res.end.bind(res);
        let requestCounted = false;

        res.end = function (chunk?: any, encoding?: any, callback?: any): any {
            if (!requestCounted) {
                const statusCode = res.statusCode;
                const shouldCount =
                    (!skipSuccessfulRequests || statusCode >= 400) &&
                    (!skipFailedRequests || statusCode < 400);

                if (shouldCount) {
                    entry!.requests.push(now);
                }
                requestCounted = true;
            }
            return originalEnd(chunk, encoding, callback);
        };

        // Add throttle info to response headers
        res.setHeader('X-RateLimit-Limit', maxRequests.toString());
        res.setHeader('X-RateLimit-Remaining', (maxRequests - entry.requests.length - 1).toString());
        res.setHeader('X-RateLimit-Reset', new Date(entry.resetTime).toISOString());

        next();
    };
}

// Cleanup old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (now > entry.resetTime && entry.requests.length === 0) {
            store.delete(key);
        }
    }
}, 60000); // Clean up every minute
