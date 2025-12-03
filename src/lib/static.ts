import * as fs from 'fs';
import * as path from 'path';
import { Request, Response, NextFunction } from '../index';
import * as mime from './mime-types';

export interface StaticOptions {
    index?: string[];
    dotfiles?: 'allow' | 'deny' | 'ignore';
    maxAge?: number;
    etag?: boolean;
}

export function serveStatic(root: string, options: StaticOptions = {}) {
    const {
        index = ['index.html'],
        dotfiles = 'ignore',
        maxAge = 0,
        etag = true,
    } = options;

    return (req: Request, res: Response, next: NextFunction) => {
        // Only handle GET and HEAD requests
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            next();
            return;
        }

        const urlPath = (req as any).path || req.url || '/';

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
                } catch {
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
