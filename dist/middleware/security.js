"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityHeaders = void 0;
const securityHeaders = (options = {}) => {
    return (req, res, next) => {
        if (options.dnsPrefetchControl !== false) {
            res.setHeader('X-DNS-Prefetch-Control', 'off');
        }
        if (options.frameguard !== false) {
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        }
        if (options.hsts !== false) {
            res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
        }
        if (options.ieNoOpen !== false) {
            res.setHeader('X-Download-Options', 'noopen');
        }
        if (options.noSniff !== false) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }
        if (options.xssFilter !== false) {
            res.setHeader('X-XSS-Protection', '1; mode=block');
        }
        if (options.hidePoweredBy !== false) {
            res.removeHeader('X-Powered-By');
        }
        next();
    };
};
exports.securityHeaders = securityHeaders;
