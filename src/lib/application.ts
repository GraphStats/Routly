import * as http from 'http';
import { Router, Handler } from './router';
import { Request } from './request';
import { Response, enhanceResponse } from './response';
import { RouteGroup } from './route-group';
import { enhanceRequest } from './request-enhancer';

export class Routly {
    private router: Router;

    constructor() {
        this.router = new Router();
    }

    use(path: string, handler: Handler) {
        this.router.use(path, handler);
    }

    get(path: string, handler: Handler) {
        this.router.add('GET', path, handler);
    }

    post(path: string, handler: Handler) {
        this.router.add('POST', path, handler);
    }

    put(path: string, handler: Handler) {
        this.router.add('PUT', path, handler);
    }

    delete(path: string, handler: Handler) {
        this.router.add('DELETE', path, handler);
    }

    patch(path: string, handler: Handler) {
        this.router.add('PATCH', path, handler);
    }

    options(path: string, handler: Handler) {
        this.router.add('OPTIONS', path, handler);
    }

    group(prefix: string, callback: (group: RouteGroup) => void) {
        const group = new RouteGroup(prefix, this.router);
        callback(group);
    }

    listen(port: number, callback?: () => void) {
        const server = http.createServer((req, res) => {
            // Enhance request and response
            const enhancedReq = enhanceRequest(req);

            // Parse URL and Query
            const url = new URL(req.url || '/', `http://${req.headers.host}`);
            enhancedReq.query = Object.fromEntries(url.searchParams);
            enhancedReq.params = {};

            // Override req.url to be just the pathname for routing
            // We need to be careful not to break original url if needed, but for routing pathname is key.
            Object.defineProperty(enhancedReq, 'path', { value: url.pathname });

            const enhancedRes = enhanceResponse(res);

            this.router.handle(enhancedReq, enhancedRes, (err) => {
                if (err) {
                    enhancedRes.statusCode = 500;
                    enhancedRes.end('Internal Server Error');
                    console.error(err);
                    return;
                }
                // Default 404 handler if no route matched
                enhancedRes.statusCode = 404;
                enhancedRes.end('Cannot ' + req.method + ' ' + req.url);
            });
        });

        server.listen(port, callback);
    }
}
