import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';

export interface MethodOverrideOptions {
    key?: string; // default '_method'
    methods?: string[]; // default ['POST']
}

export const methodOverride = (options: MethodOverrideOptions = {}) => {
    const key = options.key || '_method';
    const methods = options.methods || ['POST'];

    return (req: Request, res: Response, next: NextFunction) => {
        // Check header first
        const headerOverride = req.headers['x-http-method-override'];
        if (headerOverride) {
            req.method = (Array.isArray(headerOverride) ? headerOverride[0] : headerOverride).toUpperCase();
            return next();
        }

        // Check body if parsed and method is allowed
        if (req.body && typeof req.body === 'object' && methods.includes(req.method || '')) {
            const method = req.body[key];
            if (method) {
                req.method = method.toUpperCase();
                delete req.body[key];
            }
        }

        next();
    };
};
