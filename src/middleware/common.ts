import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';
import * as crypto from 'crypto';

export const requestId = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const id = crypto.randomUUID();
        req.headers['x-request-id'] = id;
        res.setHeader('X-Request-ID', id);
        next();
    };
};

export const responseTime = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            res.setHeader('X-Response-Time', `${duration}ms`);
        });
        next();
    };
};

export const favicon = (path: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.url === '/favicon.ico') {
            res.statusCode = 204;
            res.end();
        } else {
            next();
        }
    };
};

export const maintenanceMode = (enabled: boolean = false, message: string = 'Site under maintenance') => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (enabled) {
            res.statusCode = 503;
            res.send(message);
        } else {
            next();
        }
    };
};

export const forceSSL = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Check if secure (basic check, might need proxy trust config)
        const isSecure = (req.connection as any).encrypted || req.headers['x-forwarded-proto'] === 'https';
        if (!isSecure && req.headers.host) {
            res.redirect(`https://${req.headers.host}${req.url}`, 301);
        } else {
            next();
        }
    };
};

export const ipFilter = (ips: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const clientIp = req.socket.remoteAddress || '';
        if (!ips.includes(clientIp)) {
            res.statusCode = 403;
            res.send('Forbidden');
        } else {
            next();
        }
    };
};

export const userAgent = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const ua = req.headers['user-agent'];
        (req as any).userAgent = ua;
        next();
    };
};
