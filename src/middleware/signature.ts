import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';
import * as crypto from 'crypto';

export interface SignatureOptions {
    secret: string;
    algorithm?: 'sha1' | 'sha256' | 'sha512';
    header?: string;
    prefix?: string;
    encoding?: 'hex' | 'base64';
    onVerificationFailed?: (req: Request, res: Response) => void;
}

/**
 * Request signature verification middleware
 * Verify webhook signatures (GitHub, Stripe, etc.)
 */
export function verifySignature(options: SignatureOptions): Handler {
    const {
        secret,
        algorithm = 'sha256',
        header = 'x-hub-signature-256',
        prefix = 'sha256=',
        encoding = 'hex',
        onVerificationFailed = (req, res) => {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid signature'
            });
        }
    } = options;

    return async (req: Request, res: Response, next: Function) => {
        const signature = req.headers[header.toLowerCase()] as string;

        if (!signature) {
            return onVerificationFailed(req, res);
        }

        // Get raw body
        const body = req.body;
        const payload = typeof body === 'string' ? body : JSON.stringify(body);

        // Calculate expected signature
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(payload);
        const expectedSignature = prefix + hmac.digest(encoding);

        // Compare signatures (timing-safe)
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length) {
            return onVerificationFailed(req, res);
        }

        const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

        if (!isValid) {
            return onVerificationFailed(req, res);
        }

        next();
    };
}

/**
 * GitHub webhook signature verification
 */
export function verifyGitHubSignature(secret: string): Handler {
    return verifySignature({
        secret,
        algorithm: 'sha256',
        header: 'x-hub-signature-256',
        prefix: 'sha256='
    });
}

/**
 * Stripe webhook signature verification
 */
export function verifyStripeSignature(secret: string): Handler {
    return verifySignature({
        secret,
        algorithm: 'sha256',
        header: 'stripe-signature',
        prefix: '',
        encoding: 'hex'
    });
}

/**
 * Generate signature for outgoing requests
 */
export function generateSignature(
    payload: string | object,
    secret: string,
    algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha256',
    encoding: 'hex' | 'base64' = 'hex'
): string {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return hmac.digest(encoding);
}
