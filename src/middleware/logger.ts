import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';

export const logger = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        const { method, url } = req;

        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            // Simple console log, can be enhanced
            console.log(`${new Date().toISOString()} - ${method} ${url} ${status} - ${duration}ms`);
        });

        next();
    };
};
