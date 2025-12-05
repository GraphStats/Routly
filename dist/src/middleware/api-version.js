"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiVersion = apiVersion;
exports.versionedHandler = versionedHandler;
/**
 * API versioning middleware
 * Supports versioning via headers, URL path, or query params
 */
function apiVersion(options) {
    const { versions, defaultVersion = versions[versions.length - 1], versionParam = 'header', headerName = 'API-Version', queryName = 'version', deprecatedVersions = {}, onVersionMismatch = (req, res) => {
        res.status(400).json({
            error: 'Invalid API Version',
            message: `Supported versions: ${versions.join(', ')}`,
            requestedVersion: req.apiVersion
        });
    } } = options;
    return async (req, res, next) => {
        let version;
        // Extract version based on parameter type
        switch (versionParam) {
            case 'header':
                version = req.headers[headerName.toLowerCase()];
                break;
            case 'query':
                version = req.query[queryName];
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
            req.apiVersion = version;
            return onVersionMismatch(req, res);
        }
        // Add version to request
        req.apiVersion = version;
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
function versionedHandler(handlers) {
    return async (req, res, next) => {
        const version = req.apiVersion;
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
