import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import * as crypto from 'crypto';

/**
 * Generate a unique fingerprint for each request
 * Based on IP, headers, and user-agent
 */
export function fingerprint(): Handler {
    return async (req: Request, res: Response, next: Function) => {
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
export function generateFingerprint(req: Request): string {
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
