"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subdomain = void 0;
const subdomain = (sub, router) => {
    return (req, res, next) => {
        const host = req.headers.host;
        if (!host)
            return next();
        const parts = host.split('.');
        // Check if the first part matches the requested subdomain
        // This assumes a structure like sub.domain.com or sub.localhost
        if (parts.length >= 2 && parts[0] === sub) {
            return router.handle(req, res, next);
        }
        next();
    };
};
exports.subdomain = subdomain;
