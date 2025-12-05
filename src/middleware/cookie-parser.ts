import { Request, Response, NextFunction } from '../index';

export function cookieParser() {
    return (req: Request, res: Response, next: NextFunction) => {
        const cookieHeader = req.headers.cookie;

        if (!cookieHeader) {
            req.cookies = {};
            next();
            return;
        }

        const cookies: { [key: string]: string } = {};

        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.split('=');
            const value = rest.join('=');

            if (name && value) {
                cookies[name.trim()] = decodeURIComponent(value.trim());
            }
        });

        req.cookies = cookies;
        next();
    };
}
