import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';
import * as zlib from 'zlib';

export const compression = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const acceptEncoding = req.headers['accept-encoding'] as string;
        if (!acceptEncoding) {
            return next();
        }

        // Store original methods
        const originalSend = res.send;
        const originalJson = res.json;

        // Override send
        res.send = (body: string | Buffer) => {
            let buffer: Buffer;
            if (typeof body === 'string') {
                buffer = Buffer.from(body);
            } else {
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
            } else if (acceptEncoding.includes('gzip')) {
                zlib.gzip(buffer, (err, result) => {
                    if (err) {
                        return originalSend.call(res, body);
                    }
                    res.setHeader('Content-Encoding', 'gzip');
                    originalSend.call(res, result);
                });
            } else if (acceptEncoding.includes('deflate')) {
                zlib.deflate(buffer, (err, result) => {
                    if (err) {
                        return originalSend.call(res, body);
                    }
                    res.setHeader('Content-Encoding', 'deflate');
                    originalSend.call(res, result);
                });
            } else {
                originalSend.call(res, body);
            }
        };

        // Override json
        res.json = (body: any) => {
            const jsonString = JSON.stringify(body);
            res.setHeader('Content-Type', 'application/json');
            res.send(jsonString);
        };

        next();
    };
};
