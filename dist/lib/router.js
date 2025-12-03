"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
class Router {
    constructor() {
        this.stack = [];
    }
    use(path, handler) {
        this.stack.push({ path, handler, isMiddleware: true });
    }
    add(method, path, handler) {
        this.stack.push({ method, path, handler, isMiddleware: false });
    }
    handle(req, res, done) {
        let idx = 0;
        const next = (err) => {
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
            const urlPath = req.path || req.url || '/';
            let match = false;
            let params = {};
            if (layer.isMiddleware) {
                if (urlPath.startsWith(layer.path)) {
                    match = true;
                }
            }
            else {
                // Route matching
                // Check if layer.path has parameters (e.g. /users/:id)
                if (layer.path.includes(':')) {
                    const paramNames = [];
                    const regexPath = layer.path.replace(/:([^\/]+)/g, (_, paramName) => {
                        paramNames.push(paramName);
                        return '([^\\/]+)';
                    });
                    const regex = new RegExp(`^${regexPath}$`);
                    const matchResult = urlPath.match(regex);
                    if (matchResult && layer.method === method) {
                        match = true;
                        // Extract params
                        matchResult.slice(1).forEach((value, index) => {
                            params[paramNames[index]] = value;
                        });
                    }
                }
                else {
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
                }
                catch (error) {
                    next(error);
                }
            }
            else {
                next();
            }
        };
        next();
    }
}
exports.Router = Router;
