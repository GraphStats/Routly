import { Handler, NextFunction } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';

export interface ApiVersionOptions {
    versions: string[];
    defaultVersion?: string;
    versionParam?: 'header' | 'path' | 'query';
    headerName?: string;
    queryName?: string;
    deprecatedVersions?: Record<string, string>; // version -> deprecation message
    onVersionMismatch?: (req: Request, res: Response) => void;
}

/**
 * API versioning middleware
 * Supports versioning via headers, URL path, or query params
 */
export function apiVersion(options: ApiVersionOptions): Handler {
    const {
        versions,
        defaultVersion = versions[versions.length - 1],
        versionParam = 'header',
        headerName = 'API-Version',
        queryName = 'version',
        deprecatedVersions = {},
        onVersionMismatch = (req, res) => {
            res.status(400).json({
                error: 'Invalid API Version',
                message: `Supported versions: ${versions.join(', ')}`,
                requestedVersion: (req as any).apiVersion
            });
        }
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        let version: string | undefined;

        // Extract version based on parameter type
        switch (versionParam) {
            case 'header':
                version = req.headers[headerName.toLowerCase()] as string;
                break;
            case 'query':
                version = req.query[queryName] as string;
                break;
            case 'path':
                // Extract from path like /v1/users or /api/v2/users
                const path = req.path || req.url || '/';
                const match = path.match(/\/v(\d+(?:\.\d+)?)\//);
                version = match ? match[1] : undefined;
                break;
        }

        // Use default if not specified
        if (!version) {
            version = defaultVersion;
        }

        // Validate version
        if (!versions.includes(version)) {
            (req as any).apiVersion = version;
            return onVersionMismatch(req, res);
        }

        // Add version to request
        (req as any).apiVersion = version;

        // Add version to response headers
        res.setHeader('API-Version', version);

        // Check for deprecation
        if (deprecatedVersions[version]) {
            res.setHeader('Deprecation', 'true');
            res.setHeader('Sunset', deprecatedVersions[version]);
            const protocol = req.protocol || 'http';
            const host = req.headers.host || 'localhost';
            res.setHeader('Link', `<${protocol}://${host}/docs/migration>; rel="deprecation"`);
        }

        next();
    };
}

/**
 * Helper to create version-specific route handlers
 */
export function versionedHandler(handlers: Record<string, Handler>): Handler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const version = (req as any).apiVersion;
        const handler = handlers[version] || handlers['default'];

        if (!handler) {
            return res.status(501).json({
                error: 'Not Implemented',
                message: `Version ${version} is not implemented for this endpoint`
            });
        }

        return handler(req, res, next);
    };
}
