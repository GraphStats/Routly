import { IncomingMessage, ServerResponse } from 'http';
import { Request } from './request';
import { Response } from './response';

export type NextFunction = (err?: any) => void;
export type Handler = (req: Request, res: Response, next: NextFunction) => void;

interface Layer {
    method?: string; // If undefined, it matches all methods (middleware)
    path: string;
    handler: Handler;
    isMiddleware: boolean;
}

export class Router {
    private stack: Layer[] = [];

    use(path: string, handler: Handler) {
        this.stack.push({ path, handler, isMiddleware: true });
    }

    add(method: string, path: string, handler: Handler) {
        this.stack.push({ method, path, handler, isMiddleware: false });
    }

    handle(req: Request, res: Response, done: NextFunction) {
        let idx = 0;

        const next: NextFunction = (err) => {
            if (err) {
                return done(err);
            }

            if (idx >= this.stack.length) {
                return done();
            }

            const layer = this.stack[idx++];
            const method = req.method || 'GET';

            // Use the parsed path if available, otherwise fallback to url (which might have query string)
            // In application.ts we added 'path' property to enhancedReq but it's not in the interface yet.
            const urlPath = (req as any).path || req.url || '/';

            let match = false;
            let params: { [key: string]: string } = {};

            if (layer.isMiddleware) {
                if (urlPath.startsWith(layer.path)) {
                    match = true;
                }
            } else {
                // Route matching
                // Check if layer.path has parameters (e.g. /users/:id)
                if (layer.path.includes(':')) {
                    const paramNames: string[] = [];
                    const regexPath = layer.path.replace(/:([^\/]+)/g, (_: string, paramName: string) => {
                        paramNames.push(paramName);
                        return '([^\\/]+)';
                    });

                    const regex = new RegExp(`^${regexPath}$`);
                    const matchResult = urlPath.match(regex);

                    if (matchResult && layer.method === method) {
                        match = true;
                        // Extract params
                        matchResult.slice(1).forEach((value: string, index: number) => {
                            params[paramNames[index]] = value;
                        });
                    }
                } else {
                    // Exact match
                    if (layer.method === method && layer.path === urlPath) {
                        match = true;
                    }
                }
            }

            if (match) {
                req.params = { ...req.params, ...params }; // Merge params
                try {
                    layer.handler(req, res, next);
                } catch (error) {
                    next(error);
                }
            } else {
                next();
            }
        };

        next();
    }
}
