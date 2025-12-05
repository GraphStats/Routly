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
exports.fingerprint = fingerprint;
exports.generateFingerprint = generateFingerprint;
const crypto = __importStar(require("crypto"));
/**
 * Generate a unique fingerprint for each request
 * Based on IP, headers, and user-agent
 */
function fingerprint() {
    return async (req, res, next) => {
        const components = [
            req.ip || '',
            req.headers['user-agent'] || '',
            req.headers['accept-language'] || '',
            req.headers['accept-encoding'] || '',
            req.headers['accept'] || ''
        ];
        const fingerprintString = components.join('|');
        const hash = crypto.createHash('sha256').update(fingerprintString).digest('hex');
        req.fingerprint = hash;
        next();
    };
}
/**
 * Generate fingerprint from request
 */
function generateFingerprint(req) {
    const components = [
        req.ip || '',
        req.headers['user-agent'] || '',
        req.headers['accept-language'] || '',
        req.headers['accept-encoding'] || '',
        req.headers['accept'] || ''
    ];
    const fingerprintString = components.join('|');
    return crypto.createHash('sha256').update(fingerprintString).digest('hex');
}
