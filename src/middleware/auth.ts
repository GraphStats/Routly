import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';

export const basicAuth = (validate: (user: string, pass: string) => boolean | Promise<boolean>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }

        const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        const user = credentials[0];
        const pass = credentials[1];

        if (await validate(user, pass)) {
            (req as any).user = { name: user };
            next();
        } else {
            res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            res.statusCode = 401;
            res.end('Unauthorized');
        }
    };
};

export const bearerToken = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            (req as any).token = auth.split(' ')[1];
        }
        next();
    };
};
