// routly.config.js
// Central configuration for the Routly framework.
// Adjust these settings to configure the system globally.

module.exports = {
    // Server settings
    port: 3000, // Port on which the server will listen
    host: '127.0.0.1', // Host address

    // Subdomain routing configuration
    subdomainRouting: {
        enabled: true,
        // Map subdomains to specific route prefixes or handlers
        // Example: { 'api': '/api', 'admin': '/admin' }
        mappings: {}
    },

    // CORS configuration
    cors: {
        enabled: true,
        origin: '*', // Adjust as needed for security
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },

    // Rate limiting configuration
    rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100 // limit each IP to 100 requests per windowMs
    },

    // Middleware toggles
    middleware: {
        compression: true,
        securityHeaders: true,
        requestId: true,
        logger: true,
        responseTime: true,
        favicon: true,
        maintenanceMode: false,
        forceSSL: false,
        ipFiltering: false,
        userAgentParsing: false
    },

    // Validation settings
    validation: {
        // Enable built-in request validation
        enabled: true,
        // Schema directory (relative to project root)
        schemaDir: './validation-schemas'
    }
};
