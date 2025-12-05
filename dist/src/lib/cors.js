"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cors = cors;
function cors(options = {}) {
    const { origin = '*', methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], allowedHeaders = ['Content-Type', 'Authorization'], exposedHeaders = [], credentials = false, maxAge = 86400, } = options;
    return (req, res, next) => {
        const requestOrigin = req.headers.origin || '';
        // Determine allowed origin
        let allowedOrigin = '*';
        if (typeof origin === 'string') {
            allowedOrigin = origin;
        }
        else if (Array.isArray(origin)) {
            allowedOrigin = origin.includes(requestOrigin) ? requestOrigin : origin[0];
        }
        else if (typeof origin === 'function') {
            allowedOrigin = origin(requestOrigin) ? requestOrigin : '';
        }
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        if (exposedHeaders.length > 0) {
            res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
        }
        if (credentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
        }
        next();
    };
}
