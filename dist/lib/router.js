"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
class Router {
    constructor(options = {}) {
        this.stack = [];
        this.options = {
            caseSensitive: false,
            strict: false,
            ...options
        };
    }
    use(path, handler) {
        this.addLayer(undefined, path, handler, true);
    }
    add(method, path, handler) {
        return this.addLayer(method, path, handler, false);
    }
    addLayer(method, path, handler, isMiddleware) {
        const keys = [];
        const regexp = this.pathToRegexp(path, keys, isMiddleware);
        const layer = { method, path, handler, isMiddleware, keys, regexp };
        this.stack.push(layer);
        return {
            name: (name) => {
                layer.name = name;
                return {
                    name: (n) => { layer.name = n; return this.addLayer(method, path, handler, isMiddleware); } // chaining fix? No, just return same object
                };
            }
        };
    }
    url(name, params = {}) {
        const layer = this.stack.find(l => l.name === name);
        if (!layer)
            return null;
        if (layer.path instanceof RegExp)
            return null; // Cannot reverse regex
        let url = layer.path;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(new RegExp(`:${key}\\??`), String(value));
        }
        // Remove remaining optional params
        url = url.replace(/\/:[^\/]+\?/g, '');
        return url;
    }
    pathToRegexp(path, keys, isMiddleware) {
        if (path instanceof RegExp) {
            return path;
        }
        let source = path;
        // Escape special characters except for parameter markers
        source = source.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        // Optional parameters: /:id? -> (?:/([^/]+?))?
        source = source.replace(/:(\w+)\?/g, (_, key) => {
            keys.push(key);
            return '(?:/([^/]+?))?';
        });
        // Normal parameters: /:id -> /([^/]+?)
        source = source.replace(/:(\w+)/g, (_, key) => {
            keys.push(key);
            return '/([^/]+?)';
        });
        // Wildcard: * -> (.*)
        source = source.replace(/\*/g, '(.*)');
        // Middleware matches prefix, routes match exact
        if (isMiddleware) {
            source += '.*'; // Match anything after
        }
        else {
            // Strict routing: if not strict, optional trailing slash
            if (!this.options.strict) {
                source += '/?';
            }
            source += '$';
        }
        // Case sensitivity
        const flags = this.options.caseSensitive ? '' : 'i';
        // Ensure it starts with ^
        if (!source.startsWith('^')) {
            source = '^' + source;
        }
        return new RegExp(source, flags);
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
            // Use the parsed path if available, otherwise fallback to url
            const urlPath = req.path || req.url || '/';
            let match = false;
            let params = {};
            // Check method for routes (not middleware)
            if (!layer.isMiddleware && layer.method !== method && layer.method !== 'ALL') {
                return next();
            }
            const matchResult = layer.regexp.exec(urlPath);
            if (matchResult) {
                match = true;
                // Extract params
                // The first element is the full match, subsequent are capturing groups
                // We need to map capturing groups to keys
                // Note: Wildcards (*) also create capturing groups but won't have keys if we didn't name them
                // Our simple implementation pushes keys for :params. 
                // For * we might need to handle it differently if we want req.params[0] etc.
                let keyIndex = 0;
                for (let i = 1; i < matchResult.length; i++) {
                    const val = matchResult[i];
                    if (val !== undefined) {
                        const key = layer.keys[keyIndex++];
                        if (key) {
                            params[key] = decodeURIComponent(val);
                        }
                        else {
                            // Unnamed params (like wildcards)
                            params[i - 1] = decodeURIComponent(val);
                        }
                    }
                }
            }
            if (match) {
                req.params = { ...req.params, ...params }; // Merge params
                try {
                    const result = layer.handler(req, res, next);
                    // Handle async handlers
                    if (result && typeof result.then === 'function') {
                        result.catch(next);
                    }
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
