import { Request } from './request';
import { Response } from './response';
import { NextFunction } from './router';

export interface ErrorHandlerOptions {
    log?: boolean;
    showStack?: boolean;
}

export class HttpError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message);
        this.name = 'HttpError';
    }
}

export function errorHandler(options: ErrorHandlerOptions = {}) {
    const { log = true, showStack = process.env.NODE_ENV !== 'production' } = options;

    return (err: any, req: Request, res: Response, next: NextFunction) => {
        if (log) {
            console.error('[Error]', err);
        }

        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal Server Error';

        const errorResponse: any = {
            error: message,
            statusCode,
        };

        if (showStack && err.stack) {
            errorResponse.stack = err.stack;
        }

        res.status(statusCode).json(errorResponse);
    };
}

// Async error wrapper
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

// Common HTTP errors
export const createError = {
    badRequest: (message = 'Bad Request') => new HttpError(400, message),
    unauthorized: (message = 'Unauthorized') => new HttpError(401, message),
    forbidden: (message = 'Forbidden') => new HttpError(403, message),
    notFound: (message = 'Not Found') => new HttpError(404, message),
    conflict: (message = 'Conflict') => new HttpError(409, message),
    internal: (message = 'Internal Server Error') => new HttpError(500, message),
};
