import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction, Router } from '../core/router';

export const subdomain = (sub: string, router: Router) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const host = req.headers.host;
        if (!host) return next();

        const parts = host.split('.');

        // Check if the first part matches the requested subdomain
        // This assumes a structure like sub.domain.com or sub.localhost
        if (parts.length >= 2 && parts[0] === sub) {
            return router.handle(req, res, next);
        }

        next();
    };
};
