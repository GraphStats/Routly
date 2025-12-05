"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAgent = exports.ipFilter = exports.forceSSL = exports.maintenanceMode = exports.favicon = exports.responseTime = exports.requestId = void 0;
const crypto = __importStar(require("crypto"));
const requestId = () => {
    return (req, res, next) => {
        const id = crypto.randomUUID();
        req.headers['x-request-id'] = id;
        res.setHeader('X-Request-ID', id);
        next();
    };
};
exports.requestId = requestId;
const responseTime = () => {
    return (req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            res.setHeader('X-Response-Time', `${duration}ms`);
        });
        next();
    };
};
exports.responseTime = responseTime;
const favicon = (path) => {
    return (req, res, next) => {
        if (req.url === '/favicon.ico') {
            res.statusCode = 204;
            res.end();
        }
        else {
            next();
        }
    };
};
exports.favicon = favicon;
const maintenanceMode = (enabled = false, message = 'Site under maintenance') => {
    return (req, res, next) => {
        if (enabled) {
            res.statusCode = 503;
            res.send(message);
        }
        else {
            next();
        }
    };
};
exports.maintenanceMode = maintenanceMode;
const forceSSL = () => {
    return (req, res, next) => {
        // Check if secure (basic check, might need proxy trust config)
        const isSecure = req.connection.encrypted || req.headers['x-forwarded-proto'] === 'https';
        if (!isSecure && req.headers.host) {
            res.redirect(`https://${req.headers.host}${req.url}`, 301);
        }
        else {
            next();
        }
    };
};
exports.forceSSL = forceSSL;
const ipFilter = (ips) => {
    return (req, res, next) => {
        const clientIp = req.socket.remoteAddress || '';
        if (!ips.includes(clientIp)) {
            res.statusCode = 403;
            res.send('Forbidden');
        }
        else {
            next();
        }
    };
};
exports.ipFilter = ipFilter;
const userAgent = () => {
    return (req, res, next) => {
        const ua = req.headers['user-agent'];
        req.userAgent = ua;
        next();
    };
};
exports.userAgent = userAgent;
