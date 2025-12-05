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
exports.serveStatic = serveStatic;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const mime = __importStar(require("../utils/mime-types"));
function serveStatic(root, options = {}) {
    const { index = ['index.html'], dotfiles = 'ignore', maxAge = 0, etag = true, } = options;
    return (req, res, next) => {
        // Only handle GET and HEAD requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            next();
            return;
        }
        const urlPath = req.path || req.url || '/';
        // Remove query string
        const pathname = urlPath.split('?')[0];
        // Prevent directory traversal
        const normalizedPath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(root, normalizedPath);
        // Check for dotfiles
        if (dotfiles !== 'allow') {
            const basename = path.basename(filePath);
            if (basename.startsWith('.')) {
                if (dotfiles === 'deny') {
                    res.statusCode = 403;
                    res.end('Forbidden');
                    return;
                }
                // ignore - pass to next middleware
                next();
                return;
            }
        }
        fs.stat(filePath, (err, stats) => {
            if (err) {
                next();
                return;
            }
            // If directory, try index files
            if (stats.isDirectory()) {
                let found = false;
                for (const indexFile of index) {
                    const indexPath = path.join(filePath, indexFile);
                    if (fs.existsSync(indexPath)) {
                        filePath = indexPath;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    next();
                    return;
                }
                // Re-stat the index file
                try {
                    const indexStats = fs.statSync(filePath);
                    stats.size = indexStats.size;
                    stats.mtime = indexStats.mtime;
                }
                catch {
                    next();
                    return;
                }
            }
            // Set content type
            const ext = path.extname(filePath).slice(1);
            const contentType = mime.getType(ext) || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);
            // Set cache headers
            if (maxAge > 0) {
                res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
            }
            // Set ETag
            if (etag) {
                const etagValue = `"${stats.size}-${stats.mtime.getTime()}"`;
                res.setHeader('ETag', etagValue);
                // Check if-none-match
                const ifNoneMatch = req.headers['if-none-match'];
                if (ifNoneMatch === etagValue) {
                    res.statusCode = 304;
                    res.end();
                    return;
                }
            }
            // Set content length
            res.setHeader('Content-Length', stats.size);
            // Handle HEAD requests
            if (req.method === 'HEAD') {
                res.end();
                return;
            }
            // Stream the file
            const stream = fs.createReadStream(filePath);
            stream.on('error', () => {
                res.statusCode = 500;
                res.end('Internal Server Error');
            });
            stream.pipe(res);
        });
    };
}
