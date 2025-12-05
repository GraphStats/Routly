"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = void 0;
class Router {
    constructor(options = {}) {
        this.stack = [];
        this.routePrefix = '';
        this.autoOptions = true;
        this.options = {
            caseSensitive: false,
            strict: false,
            ...options
        };
    }
    /**
     * Set a prefix for all routes
     */
    prefix(prefix) {
        this.routePrefix = prefix;
        return this;
    }
    /**
     * Enable/disable automatic OPTIONS handler
     */
    setAutoOptions(enabled) {
        this.autoOptions = enabled;
        return this;
    }
    use(path, handler) {
        this.addLayer(undefined, path, handler, true);
    }
    add(method, path, handler) {
        return this.addLayer(method, path, handler, false);
    }
    addLayer(method, path, handler, isMiddleware) {
        const keys = [];
        // Apply prefix to string paths
        let finalPath = path;
        if (typeof path === 'string' && this.routePrefix && !isMiddleware) {
            finalPath = this.routePrefix + path;
        }
        const regexp = this.pathToRegexp(finalPath, keys, isMiddleware);
        const layer = { method, path: finalPath, handler, isMiddleware, keys, regexp };
        this.stack.push(layer);
        const route = {
            name: (name) => {
                layer.name = name;
                return route;
            },
            alias: (aliasPath) => {
                const aliases = Array.isArray(aliasPath) ? aliasPath : [aliasPath];
                layer.aliases = aliases;
                // Add additional layers for each alias
                aliases.forEach(alias => {
                    const aliasKeys = [];
                    const aliasFinalPath = typeof alias === 'string' && this.routePrefix ? this.routePrefix + alias : alias;
                    const aliasRegexp = this.pathToRegexp(aliasFinalPath, aliasKeys, isMiddleware);
                    const aliasLayer = {
                        method,
                        path: aliasFinalPath,
                        handler,
                        isMiddleware,
                        keys: aliasKeys,
                        regexp: aliasRegexp,
                        constraints: layer.constraints
                    };
                    this.stack.push(aliasLayer);
                });
                return route;
            },
            constraint: (param, constraint) => {
                if (!layer.constraints)
                    layer.constraints = {};
                layer.constraints[param] = constraint;
                return route;
            },
            constraints: (constraints) => {
                layer.constraints = { ...layer.constraints, ...constraints };
                return route;
            }
        };
        return route;
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
        // The slash is already in the source string before the parameter if it was typed as /:id
        // But wait, let's look at the logic.
        // If the path is /users/:id
        // source starts as /users/:id
        // We replace :id with something.
        // If we replace it with /([^/]+?), then we get /users//([^/]+?) because the slash before :id is still there?
        // Let's check the source string handling.
        // source = source.replace(/[.+^${}()|[\]\\]/g, '\\$&');
        // /users/:id -> /users/:id (slashes are not escaped by that regex)
        // Wait, if I have /users/:id
        // The slash before :id is NOT part of the match for :(\w+)
        // So it remains in the string.
        // So if I replace :id with /([^/]+?), I get /users//([^/]+?)
        // So I should replace :id with ([^/]+?)
        source = source.replace(/:(\w+)/g, (_, key) => {
            keys.push(key);
            return '([^/]+?)';
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
            let urlPath = req.path || req.url || '/';
            // Normalize path: replace double slashes with single slash
            urlPath = urlPath.replace(/\/{2,}/g, '/');
            let match = false;
            let params = {};
            // Check method for routes (not middleware)
            if (!layer.isMiddleware && layer.method !== method && layer.method !== 'ALL') {
                return next();
            }
            const matchResult = layer.regexp.exec(urlPath);
            console.log(`Checking ${method} ${urlPath} against ${layer.regexp} (isMiddleware: ${layer.isMiddleware}): ${!!matchResult}`);
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
                // Validate parameter constraints
                if (layer.constraints) {
                    const constraintErrors = [];
                    for (const [paramName, constraint] of Object.entries(layer.constraints)) {
                        const value = params[paramName];
                        if (value !== undefined) {
                            let valid = true;
                            // Type-based validation
                            if (constraint.type) {
                                valid = this.validateParamType(value, constraint.type);
                            }
                            // Pattern-based validation
                            if (valid && constraint.pattern) {
                                valid = constraint.pattern.test(value);
                            }
                            // Custom validator
                            if (valid && constraint.validator) {
                                valid = constraint.validator(value);
                            }
                            if (!valid) {
                                constraintErrors.push(`Invalid parameter '${paramName}': ${value}`);
                            }
                        }
                    }
                    if (constraintErrors.length > 0) {
                        return next(); // Skip this route if constraints fail
                    }
                }
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
    /**
     * Validate parameter type
     */
    validateParamType(value, type) {
        switch (type) {
            case 'number':
                return /^\d+$/.test(value);
            case 'uuid':
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
            case 'slug':
                return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
            case 'alpha':
                return /^[a-zA-Z]+$/.test(value);
            case 'alphanumeric':
                return /^[a-zA-Z0-9]+$/.test(value);
            default:
                return true;
        }
    }
    /**
     * Get all methods for a path (for OPTIONS handler)
     */
    getMethodsForPath(path) {
        const methods = new Set();
        for (const layer of this.stack) {
            if (layer.isMiddleware)
                continue;
            const match = layer.regexp.test(path);
            if (match && layer.method) {
                methods.add(layer.method);
            }
        }
        return Array.from(methods);
    }
    /**
     * Handle OPTIONS request automatically
     */
    handleOptions(req, res) {
        if (!this.autoOptions || req.method !== 'OPTIONS') {
            return false;
        }
        const path = req.path || req.url || '/';
        const methods = this.getMethodsForPath(path);
        if (methods.length > 0) {
            methods.push('OPTIONS');
            res.setHeader('Allow', methods.join(', '));
            res.setHeader('Content-Length', '0');
            res.statusCode = 204;
            res.end();
            return true;
        }
        return false;
    }
}
exports.Router = Router;
