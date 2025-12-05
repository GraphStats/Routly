import { Request } from '../core/request';
import { Response } from '../core/response';

export interface HealthCheck {
    name: string;
    check: () => Promise<HealthCheckResult>;
    critical?: boolean;
    timeout?: number;
}

export interface HealthCheckResult {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
    details?: any;
    responseTime?: number;
}

export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    checks: {
        [key: string]: HealthCheckResult;
    };
}

/**
 * Health check builder
 * Create health check endpoints easily
 */
export class HealthCheckBuilder {
    private checks: HealthCheck[] = [];
    private startTime: number = Date.now();

    /**
     * Add a health check
     */
    addCheck(check: HealthCheck): this {
        this.checks.push(check);
        return this;
    }

    /**
     * Add a database health check
     */
    addDatabaseCheck(name: string, checkFn: () => Promise<boolean>): this {
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
                } catch (error: any) {
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
    addCacheCheck(name: string, checkFn: () => Promise<boolean>): this {
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
                } catch (error: any) {
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
    addExternalServiceCheck(name: string, url: string): this {
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

                    return new Promise<HealthCheckResult>((resolve) => {
                        const req = protocol.get(url, (res: any) => {
                            const isHealthy = res.statusCode >= 200 && res.statusCode < 300;
                            resolve({
                                status: isHealthy ? 'healthy' : 'degraded',
                                message: `Service responded with status ${res.statusCode}`,
                                responseTime: Date.now() - start
                            });
                        });

                        req.on('error', (error: any) => {
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
                } catch (error: any) {
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
    async runChecks(): Promise<HealthCheckResponse> {
        const results: { [key: string]: HealthCheckResult } = {};
        let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

        // Run all checks in parallel
        await Promise.all(
            this.checks.map(async (check) => {
                try {
                    const result = await Promise.race([
                        check.check(),
                        new Promise<HealthCheckResult>((resolve) =>
                            setTimeout(() => resolve({
                                status: 'unhealthy',
                                message: 'Health check timeout'
                            }), check.timeout || 10000)
                        )
                    ]);

                    results[check.name] = result;

                    // Update overall status
                    if (result.status === 'unhealthy' && check.critical) {
                        overallStatus = 'unhealthy';
                    } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
                        overallStatus = 'degraded';
                    }
                } catch (error: any) {
                    results[check.name] = {
                        status: 'unhealthy',
                        message: error.message
                    };
                    if (check.critical) {
                        overallStatus = 'unhealthy';
                    }
                }
            })
        );

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
        return async (req: Request, res: Response) => {
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
        return (req: Request, res: Response) => {
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
        return async (req: Request, res: Response) => {
            const health = await this.runChecks();
            const isReady = health.status !== 'unhealthy';

            res.status(isReady ? 200 : 503).json({
                status: isReady ? 'ready' : 'not ready',
                timestamp: new Date().toISOString()
            });
        };
    }
}

/**
 * Create a new health check builder
 */
export function createHealthCheck(): HealthCheckBuilder {
    return new HealthCheckBuilder();
}
