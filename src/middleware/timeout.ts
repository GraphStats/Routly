import { Handler, NextFunction } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';

export interface TimeoutOptions {
    timeout?: number; // Timeout in milliseconds
    onTimeout?: (req: Request, res: Response) => void;
    message?: string;
}

/**
 * Request timeout middleware
 * Automatically timeout long-running requests
 */
export function timeout(options: TimeoutOptions = {}): Handler {
    const {
        timeout: timeoutMs = 30000, // 30 seconds default
        onTimeout = (req, res) => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request Timeout',
                    message: message || `Request exceeded ${timeoutMs}ms timeout`,
                    timeout: timeoutMs
                });
            }
        },
        message
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        let timeoutId: NodeJS.Timeout | null = null;
        let timedOut = false;

        // Set timeout
        timeoutId = setTimeout(() => {
            timedOut = true;
            onTimeout(req, res);
        }, timeoutMs);

        // Clear timeout when response finishes
        const originalEnd = res.end.bind(res);
        res.end = function (chunk?: any, encoding?: any, callback?: any): any {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            return originalEnd(chunk, encoding, callback);
        };

        // Add timeout info to request
        (req as any).timeout = timeoutMs;
        (req as any).isTimedOut = () => timedOut;

        next();
    };
}

/**
 * Create a timeout handler for specific routes
 */
export function withTimeout(timeoutMs: number, handler: Handler): Handler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const timeoutMiddleware = timeout({ timeout: timeoutMs });
        await timeoutMiddleware(req, res, async () => {
            await handler(req, res, next);
        });
    };
}
