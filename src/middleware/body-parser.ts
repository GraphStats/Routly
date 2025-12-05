import { Request, Response, NextFunction } from '../index';

export const bodyParser = {
    json: (options: { limit?: number } = {}) => (req: Request, res: Response, next: NextFunction) => {
        const limit = options.limit || 1024 * 1024; // 1MB default

        if (req.headers['content-type'] !== 'application/json') {
            return next();
        }

        let data = '';
        let size = 0;

        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                res.status(413).json({ error: 'Payload too large' });
                req.destroy();
                return;
            }
            data += chunk;
        });

        req.on('end', () => {
            try {
                req.body = JSON.parse(data);
            } catch (e) {
                req.body = {};
                console.error('Error parsing JSON body', e);
            }
            next();
        });
    },

    urlencoded: (options: { limit?: number; extended?: boolean } = {}) => (req: Request, res: Response, next: NextFunction) => {
        const limit = options.limit || 1024 * 1024; // 1MB default

        if (!req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
            return next();
        }

        let data = '';
        let size = 0;

        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > limit) {
                res.status(413).json({ error: 'Payload too large' });
                req.destroy();
                return;
            }
            data += chunk;
        });

        req.on('end', () => {
            try {
                const parsed: any = {};
                const params = new URLSearchParams(data);

                for (const [key, value] of params.entries()) {
                    // Handle array notation (key[])
                    if (key.endsWith('[]')) {
                        const arrayKey = key.slice(0, -2);
                        if (!parsed[arrayKey]) {
                            parsed[arrayKey] = [];
                        }
                        parsed[arrayKey].push(value);
                    } else {
                        parsed[key] = value;
                    }
                }

                req.body = parsed;
            } catch (e) {
                req.body = {};
                console.error('Error parsing URL-encoded body', e);
            }
            next();
        });
    }
};
