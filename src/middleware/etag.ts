import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import * as crypto from 'crypto';

export interface ETagOptions {
    weak?: boolean;
    algorithm?: 'md5' | 'sha1' | 'sha256';
}

/**
 * ETag generation middleware
 * Automatic ETag generation for responses with conditional request handling
 */
export function etag(options: ETagOptions = {}): Handler {
    const {
        weak = false,
        algorithm = 'md5'
    } = options;

    return async (req: Request, res: Response, next: Function) => {
        const originalSend = res.send.bind(res);
        const originalJson = res.json.bind(res);

        const generateETag = (body: any): string => {
            const content = typeof body === 'string' ? body : JSON.stringify(body);
            const hash = crypto.createHash(algorithm).update(content).digest('hex');
            return weak ? `W/"${hash}"` : `"${hash}"`;
        };

        const handleETag = (body: any, sendFn: Function): any => {
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

        res.send = function (body: any): Response {
            return handleETag(body, originalSend);
        };

        res.json = function (body: any): Response {
            return handleETag(body, originalJson);
        };

        next();
    };
}

/**
 * Generate ETag for a given content
 */
export function generateETag(content: string | Buffer, weak: boolean = false): string {
    const hash = crypto.createHash('md5').update(content).digest('hex');
    return weak ? `W/"${hash}"` : `"${hash}"`;
}

/**
 * Check if request ETag matches
 */
export function checkETag(req: Request, etag: string): boolean {
    const ifNoneMatch = req.headers['if-none-match'];
    if (!ifNoneMatch) return false;

    const matches = ifNoneMatch.split(',').map(tag => tag.trim());
    return matches.includes(etag) || matches.includes('*');
}
