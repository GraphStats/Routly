import { Request } from '../request';
import { Response } from '../response';
import { Layer } from './layer';
import { Route } from './route';
import { Handler, NextFunction, ParamConstraint, ParamConstraints } from './types';

export interface RouterOptions {
    caseSensitive?: boolean;
    strict?: boolean;
}

export class Router {
    private stack: Layer[] = [];
    private options: RouterOptions;
    private routePrefix: string = '';
    private autoOptions: boolean = true;

    constructor(options: RouterOptions = {}) {
        this.options = {
            caseSensitive: false,
            strict: false,
            ...options
        };
    }

    /**
     * Set a prefix for all routes
     */
    prefix(prefix: string): this {
        this.routePrefix = prefix;
        return this;
    }

    /**
     * Enable/disable automatic OPTIONS handler
     */
    setAutoOptions(enabled: boolean): this {
        this.autoOptions = enabled;
        return this;
    }

    use(path: string | RegExp, handler: Handler) {
        this.addLayer(undefined, path, handler, true);
    }

    add(method: string, path: string | RegExp, handler: Handler): Route {
        return this.addLayer(method, path, handler, false);
    }

    private addLayer(method: string | undefined, path: string | RegExp, handler: Handler, isMiddleware: boolean): Route {
        const keys: string[] = [];

        // Apply prefix to string paths
        let finalPath = path;
        if (typeof path === 'string' && this.routePrefix && !isMiddleware) {
            finalPath = this.routePrefix + path;
        }

        const regexp = this.pathToRegexp(finalPath, keys, isMiddleware);
        const layer: Layer = { method, path: finalPath, handler, isMiddleware, keys, regexp };
        this.stack.push(layer);

        const route: Route = {
            name: (name: string) => {
                layer.name = name;
                return route;
            },
            alias: (aliasPath: string | string[]) => {
                const aliases = Array.isArray(aliasPath) ? aliasPath : [aliasPath];
                layer.aliases = aliases;

                // Add additional layers for each alias
                aliases.forEach(alias => {
                    const aliasKeys: string[] = [];
                    const aliasFinalPath = typeof alias === 'string' && this.routePrefix ? this.routePrefix + alias : alias;
                    const aliasRegexp = this.pathToRegexp(aliasFinalPath, aliasKeys, isMiddleware);
                    const aliasLayer: Layer = {
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
            constraint: (param: string, constraint: ParamConstraint) => {
                if (!layer.constraints) layer.constraints = {};
                layer.constraints[param] = constraint;
                return route;
            },
            constraints: (constraints: ParamConstraints) => {
                layer.constraints = { ...layer.constraints, ...constraints };
                return route;
            }
        };

        return route;
    }

    url(name: string, params: { [key: string]: string | number } = {}): string | null {
        const layer = this.stack.find(l => l.name === name);
        if (!layer) return null;

        if (layer.path instanceof RegExp) return null; // Cannot reverse regex

        let url = layer.path;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(new RegExp(`:${key}\\??`), String(value));
        }

        // Remove remaining optional params
        url = url.replace(/\/:[^\/]+\?/g, '');

        return url;
    }

    private pathToRegexp(path: string | RegExp, keys: string[], isMiddleware: boolean): RegExp {
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
            return '([^/]+?)';
        });

        // Wildcard: * -> (.*)
        source = source.replace(/\*/g, '(.*)');

        // Middleware matches prefix, routes match exact
        if (isMiddleware) {
            source += '.*'; // Match anything after
        } else {
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

            // Use the parsed path if available, otherwise fallback to url
            let urlPath = (req as any).path || req.url || '/';

            // Normalize path: replace double slashes with single slash
            urlPath = urlPath.replace(/\/{2,}/g, '/');

            let match = false;
            let params: { [key: string]: string } = {};

            // Check method for routes (not middleware)
            if (!layer.isMiddleware && layer.method !== method && layer.method !== 'ALL') {
                return next();
            }

            const matchResult = layer.regexp.exec(urlPath);
            // console.log(`Checking ${method} ${urlPath} against ${layer.regexp} (isMiddleware: ${layer.isMiddleware}): ${!!matchResult}`);

            if (matchResult) {
                match = true;

                // Extract params
                let keyIndex = 0;
                for (let i = 1; i < matchResult.length; i++) {
                    const val = matchResult[i];
                    if (val !== undefined) {
                        const key = layer.keys[keyIndex++];
                        if (key) {
                            params[key] = decodeURIComponent(val);
                        } else {
                            // Unnamed params (like wildcards)
                            params[i - 1] = decodeURIComponent(val);
                        }
                    }
                }
            }

            if (match) {
                // Validate parameter constraints
                if (layer.constraints) {
                    const constraintErrors: string[] = [];

                    for (const [paramName, constraint] of Object.entries(layer.constraints as ParamConstraints)) {
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
                } catch (error) {
                    next(error);
                }
            } else {
                next();
            }
        };

        next();
    }

    /**
     * Validate parameter type
     */
    private validateParamType(value: string, type: string): boolean {
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
    private getMethodsForPath(path: string): string[] {
        const methods = new Set<string>();

        for (const layer of this.stack) {
            if (layer.isMiddleware) continue;

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
    handleOptions(req: Request, res: Response): boolean {
        if (!this.autoOptions || req.method !== 'OPTIONS') {
            return false;
        }

        const path = (req as any).path || req.url || '/';
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
