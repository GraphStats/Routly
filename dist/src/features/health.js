"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthCheckBuilder = void 0;
exports.createHealthCheck = createHealthCheck;
/**
 * Health check builder
 * Create health check endpoints easily
 */
class HealthCheckBuilder {
    constructor() {
        this.checks = [];
        this.startTime = Date.now();
    }
    /**
     * Add a health check
     */
    addCheck(check) {
        this.checks.push(check);
        return this;
    }
    /**
     * Add a database health check
     */
    addDatabaseCheck(name, checkFn) {
        this.addCheck({
            name,
            critical: true,
            check: async () => {
                const start = Date.now();
                try {
                    const isHealthy = await checkFn();
                    return {
                        status: isHealthy ? 'healthy' : 'unhealthy',
                        message: isHealthy ? 'Database connection OK' : 'Database connection failed',
                        responseTime: Date.now() - start
                    };
                }
                catch (error) {
                    return {
                        status: 'unhealthy',
                        message: error.message,
                        responseTime: Date.now() - start
                    };
                }
            }
        });
        return this;
    }
    /**
     * Add a cache health check
     */
    addCacheCheck(name, checkFn) {
        this.addCheck({
            name,
            critical: false,
            check: async () => {
                const start = Date.now();
                try {
                    const isHealthy = await checkFn();
                    return {
                        status: isHealthy ? 'healthy' : 'degraded',
                        message: isHealthy ? 'Cache connection OK' : 'Cache connection failed',
                        responseTime: Date.now() - start
                    };
                }
                catch (error) {
                    return {
                        status: 'degraded',
                        message: error.message,
                        responseTime: Date.now() - start
                    };
                }
            }
        });
        return this;
    }
    /**
     * Add an external service health check
     */
    addExternalServiceCheck(name, url) {
        this.addCheck({
            name,
            critical: false,
            timeout: 5000,
            check: async () => {
                const start = Date.now();
                try {
                    const https = require('https');
                    const http = require('http');
                    const protocol = url.startsWith('https') ? https : http;
                    return new Promise((resolve) => {
                        const req = protocol.get(url, (res) => {
                            const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
                            resolve({
                                status: isHealthy ? 'healthy' : 'degraded',
                                message: `Service responded with status ${res.statusCode}`,
                                responseTime: Date.now() - start
                            });
                        });
                        req.on('error', (error) => {
                            resolve({
                                status: 'degraded',
                                message: error.message,
                                responseTime: Date.now() - start
                            });
                        });
                        req.setTimeout(5000, () => {
                            req.destroy();
                            resolve({
                                status: 'degraded',
                                message: 'Request timeout',
                                responseTime: Date.now() - start
                            });
                        });
                    });
                }
                catch (error) {
                    return {
                        status: 'degraded',
                        message: error.message,
                        responseTime: Date.now() - start
                    };
                }
            }
        });
        return this;
    }
    /**
     * Run all health checks
     */
    async runChecks() {
        const results = {};
        let overallStatus = 'healthy';
        // Run all checks in parallel
        await Promise.all(this.checks.map(async (check) => {
            try {
                const result = await Promise.race([
                    check.check(),
                    new Promise((resolve) => setTimeout(() => resolve({
                        status: 'unhealthy',
                        message: 'Health check timeout'
                    }), check.timeout || 10000))
                ]);
                results[check.name] = result;
                // Update overall status
                if (result.status === 'unhealthy' && check.critical) {
                    overallStatus = 'unhealthy';
                }
                else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
                    overallStatus = 'degraded';
                }
            }
            catch (error) {
                results[check.name] = {
                    status: 'unhealthy',
                    message: error.message
                };
                if (check.critical) {
                    overallStatus = 'unhealthy';
                }
            }
        }));
        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            checks: results
        };
    }
    /**
     * Create a health check endpoint handler
     */
    handler() {
        return async (req, res) => {
            const health = await this.runChecks();
            const statusCode = health.status === 'healthy' ? 200 :
                health.status === 'degraded' ? 200 : 503;
            res.status(statusCode).json(health);
        };
    }
    /**
     * Create a simple liveness probe
     */
    livenessProbe() {
        return (req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString()
            });
        };
    }
    /**
     * Create a readiness probe
     */
    readinessProbe() {
        return async (req, res) => {
            const health = await this.runChecks();
            const isReady = health.status !== 'unhealthy';
            res.status(isReady ? 200 : 503).json({
                status: isReady ? 'ready' : 'not ready',
                timestamp: new Date().toISOString()
            });
        };
    }
}
exports.HealthCheckBuilder = HealthCheckBuilder;
/**
 * Create a new health check builder
 */
function createHealthCheck() {
    return new HealthCheckBuilder();
}
