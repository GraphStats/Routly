// Manual verification example for the configuration system
// This example demonstrates that the server uses the configured port and host

import { Routly } from '../src/lib/application';

const app = new Routly();

// Test 1: Verify configuration is accessible
console.log('Configuration loaded:');
console.log('Port:', Routly.config.port);
console.log('Host:', Routly.config.host);
console.log('CORS enabled:', Routly.config.cors.enabled);
console.log('Rate limiting enabled:', Routly.config.rateLimit.enabled);
console.log('Compression enabled:', Routly.config.middleware.compression);

// Test 2: Add a simple route
app.get('/', (req, res) => {
    res.json({
        message: 'Configuration system is working!',
        config: {
            port: Routly.config.port,
            host: Routly.config.host,
            corsEnabled: Routly.config.cors.enabled,
            rateLimitEnabled: Routly.config.rateLimit.enabled
        }
    });
});

// Test 3: Start server without specifying port (should use config.port)
app.start(() => {
    console.log(`\n✓ Server started successfully!`);
    console.log(`✓ Listening on ${Routly.config.host}:${Routly.config.port}`);
    console.log(`✓ Visit http://localhost:${Routly.config.port}/ to test`);
    console.log('\nPress Ctrl+C to stop the server');
});
