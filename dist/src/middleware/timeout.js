"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeout = timeout;
exports.withTimeout = withTimeout;
/**
 * Request timeout middleware
 * Automatically timeout long-running requests
 */
function timeout(options = {}) {
    const { timeout: timeoutMs = 30000, // 30 seconds default
    onTimeout = (req, res) => {
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request Timeout',
                message: message || `Request exceeded ${timeoutMs}ms timeout`,
                timeout: timeoutMs
            });
        }
    }, message } = options;
    return async (req, res, next) => {
        let timeoutId = null;
        let timedOut = false;
        // Set timeout
        timeoutId = setTimeout(() => {
            timedOut = true;
            onTimeout(req, res);
        }, timeoutMs);
        // Clear timeout when response finishes
        const originalEnd = res.end.bind(res);
        res.end = function (chunk, encoding, callback) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            return originalEnd(chunk, encoding, callback);
        };
        // Add timeout info to request
        req.timeout = timeoutMs;
        req.isTimedOut = () => timedOut;
        next();
    };
}
/**
 * Create a timeout handler for specific routes
 */
function withTimeout(timeoutMs, handler) {
    return async (req, res, next) => {
        const timeoutMiddleware = timeout({ timeout: timeoutMs });
        await timeoutMiddleware(req, res, async () => {
            await handler(req, res, next);
        });
    };
}
