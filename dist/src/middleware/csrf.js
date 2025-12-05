"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrf = void 0;
const csrf = (options = {}) => {
    const ignoreMethods = options.ignoreMethods || ['GET', 'HEAD', 'OPTIONS'];
    return (req, res, next) => {
        if (ignoreMethods.includes(req.method || 'GET')) {
            return next();
        }
        const token = (req.body && req.body._csrf) ||
            (req.query && req.query._csrf) ||
            (req.headers['csrf-token']) ||
            (req.headers['xsrf-token']) ||
            (req.headers['x-csrf-token']) ||
            (req.headers['x-xsrf-token']);
        // In a real implementation, we would verify this token against a secret stored in session or cookie.
        // For this "batteries included" but simple framework, we'll assume a 'csrfSecret' is in the session or cookie.
        // But we don't have session fully integrated yet.
        // So we'll just check if token exists for now as a placeholder or implement a simple double-submit cookie pattern.
        const secret = req.cookies && req.cookies['_csrf'];
        if (!token || !secret || token !== secret) {
            res.statusCode = 403;
            res.send('CSRF token mismatch');
            return;
        }
        next();
    };
};
exports.csrf = csrf;
