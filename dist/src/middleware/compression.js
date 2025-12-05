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
exports.compression = void 0;
const zlib = __importStar(require("zlib"));
const compression = () => {
    return (req, res, next) => {
        const acceptEncoding = req.headers['accept-encoding'];
        if (!acceptEncoding) {
            return next();
        }
        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;
        // Override send
        res.send = (body) => {
            let buffer;
            if (typeof body === 'string') {
                buffer = Buffer.from(body);
            }
            else {
                buffer = body;
            }
            if (acceptEncoding.includes('br')) {
                zlib.brotliCompress(buffer, (err, result) => {
                    if (err) {
                        // Fallback to original
                        return originalSend.call(res, body);
                    }
                    res.setHeader('Content-Encoding', 'br');
                    originalSend.call(res, result);
                });
            }
            else if (acceptEncoding.includes('gzip')) {
                zlib.gzip(buffer, (err, result) => {
                    if (err) {
                        return originalSend.call(res, body);
                    }
                    res.setHeader('Content-Encoding', 'gzip');
                    originalSend.call(res, result);
                });
            }
            else if (acceptEncoding.includes('deflate')) {
                zlib.deflate(buffer, (err, result) => {
                    if (err) {
                        return originalSend.call(res, body);
                    }
                    res.setHeader('Content-Encoding', 'deflate');
                    originalSend.call(res, result);
                });
            }
            else {
                originalSend.call(res, body);
            }
        };
        // Override json
        res.json = (body) => {
            const jsonString = JSON.stringify(body);
            res.setHeader('Content-Type', 'application/json');
            res.send(jsonString);
        };
        next();
    };
};
exports.compression = compression;
