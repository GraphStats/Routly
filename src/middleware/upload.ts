import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadOptions {
    dest?: string;
    limits?: { fileSize?: number };
}

export const upload = (options: UploadOptions = {}) => {
    const dest = options.dest || os.tmpdir();

    return (req: Request, res: Response, next: NextFunction) => {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            return next();
        }

        // Very basic multipart parser
        // In production, use busboy or formidable
        // This is a placeholder for "batteries included"

        // For now, we'll just skip parsing or implement a very naive one if needed.
        // Given the complexity of multipart parsing, I'll add a note or a simple text parser.

        // Let's assume we want to support it.
        // We can use a library if allowed.
        // Since I cannot install packages without user permission, I will provide a stub
        // that warns or does basic handling if possible.

        console.warn('Multipart parsing requires a dedicated library like busboy. This is a placeholder.');
        next();
    };
};

import * as os from 'os';
