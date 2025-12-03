"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
function rateLimit(options = {}) {
    const { windowMs = 60000, // 1 minute
    max = 100, message = 'Too many requests, please try again later.', statusCode = 429, skipSuccessfulRequests = false, skipFailedRequests = false, } = options;
    const store = {};
    // Cleanup old entries every minute
    setInterval(() => {
        const now = Date.now();
        for (const key in store) {
            if (store[key].resetTime < now) {
                delete store[key];
            }
        }
    }, 60000);
    return (req, res, next) => {
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
        res.end = function (...args) {
            if (skipSuccessfulRequests && res.statusCode < 400) {
                store[key].count--;
            }
            else if (skipFailedRequests && res.statusCode >= 400) {
                store[key].count--;
            }
            return originalEnd.apply(res, args);
        };
        next();
    };
}
