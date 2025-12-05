import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';

export interface SecurityOptions {
    contentSecurityPolicy?: boolean | object;
    dnsPrefetchControl?: boolean;
    frameguard?: boolean;
    hidePoweredBy?: boolean;
    hsts?: boolean;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    xssFilter?: boolean;
}

export const securityHeaders = (options: SecurityOptions = {}) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (options.dnsPrefetchControl !== false) {
            res.setHeader('X-DNS-Prefetch-Control', 'off');
        }


        if (options.frameguard !== false) {
            res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        }

        if (options.hsts !== false) {
            res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
        }

        if (options.ieNoOpen !== false) {
            res.setHeader('X-Download-Options', 'noopen');
        }

        if (options.noSniff !== false) {
            res.setHeader('X-Content-Type-Options', 'nosniff');
        }

        if (options.xssFilter !== false) {
            res.setHeader('X-XSS-Protection', '1; mode=block');
        }

        if (options.hidePoweredBy !== false) {
            res.removeHeader('X-Powered-By');
        }

        next();
    };
};
