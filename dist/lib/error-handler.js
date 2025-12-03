"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = exports.HttpError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
class HttpError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'HttpError';
    }
}
exports.HttpError = HttpError;
function errorHandler(options = {}) {
    const { log = true, showStack = process.env.NODE_ENV !== 'production' } = options;
    return (err, req, res, next) => {
        if (log) {
            console.error('[Error]', err);
        }
        const statusCode = err.statusCode || err.status || 500;
        const message = err.message || 'Internal Server Error';
        const errorResponse = {
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
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Common HTTP errors
exports.createError = {
    badRequest: (message = 'Bad Request') => new HttpError(400, message),
    unauthorized: (message = 'Unauthorized') => new HttpError(401, message),
    forbidden: (message = 'Forbidden') => new HttpError(403, message),
    notFound: (message = 'Not Found') => new HttpError(404, message),
    conflict: (message = 'Conflict') => new HttpError(409, message),
    internal: (message = 'Internal Server Error') => new HttpError(500, message),
};
