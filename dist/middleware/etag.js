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
exports.etag = etag;
exports.generateETag = generateETag;
exports.checkETag = checkETag;
const crypto = __importStar(require("crypto"));
/**
 * ETag generation middleware
 * Automatic ETag generation for responses with conditional request handling
 */
function etag(options = {}) {
    const { weak = false, algorithm = 'md5' } = options;
    return async (req, res, next) => {
        const originalSend = res.send.bind(res);
        const originalJson = res.json.bind(res);
        const generateETag = (body) => {
            const content = typeof body === 'string' ? body : JSON.stringify(body);
            const hash = crypto.createHash(algorithm).update(content).digest('hex');
            return weak ? `W/"${hash}"` : `"${hash}"`;
        };
        const handleETag = (body, sendFn) => {
            // Only generate ETag for successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const etagValue = generateETag(body);
                res.setHeader('ETag', etagValue);
                // Check If-None-Match header
                const ifNoneMatch = req.headers['if-none-match'];
                if (ifNoneMatch) {
                    const matches = ifNoneMatch.split(',').map(tag => tag.trim());
                    if (matches.includes(etagValue) || matches.includes('*')) {
                        // ETag matches - return 304 Not Modified
                        res.statusCode = 304;
                        res.removeHeader('Content-Type');
                        res.removeHeader('Content-Length');
                        return res.end();
                    }
                }
                // Check If-Match header (for PUT/PATCH/DELETE)
                const ifMatch = req.headers['if-match'];
                if (ifMatch && (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE')) {
                    const matches = ifMatch.split(',').map(tag => tag.trim());
                    if (!matches.includes(etagValue) && !matches.includes('*')) {
                        // ETag doesn't match - return 412 Precondition Failed
                        res.statusCode = 412;
                        return res.json({
                            error: 'Precondition Failed',
                            message: 'Resource has been modified'
                        });
                    }
                }
            }
            return sendFn(body);
        };
        res.send = function (body) {
            return handleETag(body, originalSend);
        };
        res.json = function (body) {
            return handleETag(body, originalJson);
        };
        next();
    };
}
/**
 * Generate ETag for a given content
 */
function generateETag(content, weak = false) {
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return weak ? `W/"${hash}"` : `"${hash}"`;
}
/**
 * Check if request ETag matches
 */
function checkETag(req, etag) {
    const ifNoneMatch = req.headers['if-none-match'];
    if (!ifNoneMatch)
        return false;
    const matches = ifNoneMatch.split(',').map(tag => tag.trim());
    return matches.includes(etag) || matches.includes('*');
}
