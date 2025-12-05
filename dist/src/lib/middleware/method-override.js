"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methodOverride = void 0;
const methodOverride = (options = {}) => {
    const key = options.key || '_method';
    const methods = options.methods || ['POST'];
    return (req, res, next) => {
        // Check header first
        const headerOverride = req.headers['x-http-method-override'];
        if (headerOverride) {
            req.method = (Array.isArray(headerOverride) ? headerOverride[0] : headerOverride).toUpperCase();
            return next();
        }
        // Check body if parsed and method is allowed
        if (req.body && typeof req.body === 'object' && methods.includes(req.method || '')) {
            const method = req.body[key];
            if (method) {
                req.method = method.toUpperCase();
                delete req.body[key];
            }
        }
        next();
    };
};
exports.methodOverride = methodOverride;
