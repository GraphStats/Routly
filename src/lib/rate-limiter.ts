import { Request, Response, NextFunction } from '../index';

export interface RateLimitOptions {
    windowMs?: number;
    max?: number;
    message?: string;
    statusCode?: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}

interface RateLimitStore {
    [key: string]: {
        count: number;
        resetTime: number;
    };
}

export function rateLimit(options: RateLimitOptions = {}) {
    const {
        windowMs = 60000, // 1 minute
        max = 100,
        message = 'Too many requests, please try again later.',
        statusCode = 429,
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
    } = options;

    const store: RateLimitStore = {};

    // Cleanup old entries every minute
    setInterval(() => {
        const now = Date.now();
        for (const key in store) {
            if (store[key].resetTime < now) {
                delete store[key];
            }
        }
    }, 60000);

    return (req: Request, res: Response, next: NextFunction) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();

        if (!store[key] || store[key].resetTime < now) {
            store[key] = {
                count: 0,
                resetTime: now + windowMs,
            };
        }

        store[key].count++;

        const remaining = Math.max(0, max - store[key].count);
        const resetTime = Math.ceil((store[key].resetTime - now) / 1000);

        res.setHeader('X-RateLimit-Limit', max.toString());
        res.setHeader('X-RateLimit-Remaining', remaining.toString());
        res.setHeader('X-RateLimit-Reset', resetTime.toString());

        if (store[key].count > max) {
            res.statusCode = statusCode;
            res.setHeader('Retry-After', resetTime.toString());
            res.end(JSON.stringify({ error: message }));
            return;
        }

        // Track response to potentially skip counting
        const originalEnd = res.end;
        res.end = function (...args: any[]) {
            if (skipSuccessfulRequests && res.statusCode < 400) {
                store[key].count--;
            } else if (skipFailedRequests && res.statusCode >= 400) {
                store[key].count--;
            }
            return originalEnd.apply(res, args as any);
        } as any;

        next();
    };
}
