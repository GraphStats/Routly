import { Handler } from '../core/router';
import { Request } from '../core/request';
import { Response } from '../core/response';

export interface MetricsData {
    requests: {
        total: number;
        byMethod: { [method: string]: number };
        byStatus: { [status: string]: number };
        byPath: { [path: string]: number };
    };
    responseTime: {
        total: number;
        average: number;
        min: number;
        max: number;
        p50: number;
        p95: number;
        p99: number;
    };
    errors: {
        total: number;
        byType: { [type: string]: number };
    };
    activeConnections: number;
    uptime: number;
    memory: {
        heapUsed: number;
        heapTotal: number;
        external: number;
        rss: number;
    };
}

/**
 * Metrics collection class
 */
export class Metrics {
    private startTime: number = Date.now();
    private requestCount: number = 0;
    private requestsByMethod: Map<string, number> = new Map();
    private requestsByStatus: Map<number, number> = new Map();
    private requestsByPath: Map<string, number> = new Map();
    private responseTimes: number[] = [];
    private errorCount: number = 0;
    private errorsByType: Map<string, number> = new Map();
    private activeConnections: number = 0;

    /**
     * Record a request
     */
    recordRequest(method: string, path: string, status: number, responseTime: number, error?: Error) {
        this.requestCount++;

        // By method
        this.requestsByMethod.set(method, (this.requestsByMethod.get(method) || 0) + 1);

        // By status
        this.requestsByStatus.set(status, (this.requestsByStatus.get(status) || 0) + 1);

        // By path (limit to top 100 paths to prevent memory issues)
        if (this.requestsByPath.size < 100 || this.requestsByPath.has(path)) {
            this.requestsByPath.set(path, (this.requestsByPath.get(path) || 0) + 1);
        }

        // Response time
        this.responseTimes.push(responseTime);

        // Keep only last 1000 response times
        if (this.responseTimes.length > 1000) {
            this.responseTimes.shift();
        }

        // Errors
        if (error) {
            this.errorCount++;
            const errorType = error.constructor.name;
            this.errorsByType.set(errorType, (this.errorsByType.get(errorType) || 0) + 1);
        }
    }

    /**
     * Increment active connections
     */
    incrementConnections() {
        this.activeConnections++;
    }

    /**
     * Decrement active connections
     */
    decrementConnections() {
        this.activeConnections--;
    }

    /**
     * Calculate percentile
     */
    private percentile(arr: number[], p: number): number {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get all metrics
     */
    getMetrics(): MetricsData {
        const totalResponseTime = this.responseTimes.reduce((sum, time) => sum + time, 0);
        const avgResponseTime = this.responseTimes.length > 0 ? totalResponseTime / this.responseTimes.length : 0;

        const memUsage = process.memoryUsage();

        return {
            requests: {
                total: this.requestCount,
                byMethod: Object.fromEntries(this.requestsByMethod),
                byStatus: Object.fromEntries(this.requestsByStatus),
                byPath: Object.fromEntries(this.requestsByPath)
            },
            responseTime: {
                total: totalResponseTime,
                average: avgResponseTime,
                min: this.responseTimes.length > 0 ? Math.min(...this.responseTimes) : 0,
                max: this.responseTimes.length > 0 ? Math.max(...this.responseTimes) : 0,
                p50: this.percentile(this.responseTimes, 50),
                p95: this.percentile(this.responseTimes, 95),
                p99: this.percentile(this.responseTimes, 99)
            },
            errors: {
                total: this.errorCount,
                byType: Object.fromEntries(this.errorsByType)
            },
            activeConnections: this.activeConnections,
            uptime: Math.floor((Date.now() - this.startTime) / 1000),
            memory: {
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal,
                external: memUsage.external,
                rss: memUsage.rss
            }
        };
    }

    /**
     * Get metrics in Prometheus format
     */
    getPrometheusMetrics(): string {
        const metrics = this.getMetrics();
        let output = '';

        // Request metrics
        output += '# HELP http_requests_total Total number of HTTP requests\n';
        output += '# TYPE http_requests_total counter\n';
        output += `http_requests_total ${metrics.requests.total}\n\n`;

        // Requests by method
        output += '# HELP http_requests_by_method_total Total number of HTTP requests by method\n';
        output += '# TYPE http_requests_by_method_total counter\n';
        for (const [method, count] of Object.entries(metrics.requests.byMethod)) {
            output += `http_requests_by_method_total{method="${method}"} ${count}\n`;
        }
        output += '\n';

        // Requests by status
        output += '# HELP http_requests_by_status_total Total number of HTTP requests by status\n';
        output += '# TYPE http_requests_by_status_total counter\n';
        for (const [status, count] of Object.entries(metrics.requests.byStatus)) {
            output += `http_requests_by_status_total{status="${status}"} ${count}\n`;
        }
        output += '\n';

        // Response time
        output += '# HELP http_response_time_ms HTTP response time in milliseconds\n';
        output += '# TYPE http_response_time_ms summary\n';
        output += `http_response_time_ms{quantile="0.5"} ${metrics.responseTime.p50}\n`;
        output += `http_response_time_ms{quantile="0.95"} ${metrics.responseTime.p95}\n`;
        output += `http_response_time_ms{quantile="0.99"} ${metrics.responseTime.p99}\n`;
        output += `http_response_time_ms_sum ${metrics.responseTime.total}\n`;
        output += `http_response_time_ms_count ${metrics.requests.total}\n\n`;

        // Errors
        output += '# HELP http_errors_total Total number of errors\n';
        output += '# TYPE http_errors_total counter\n';
        output += `http_errors_total ${metrics.errors.total}\n\n`;

        // Active connections
        output += '# HELP http_active_connections Number of active connections\n';
        output += '# TYPE http_active_connections gauge\n';
        output += `http_active_connections ${metrics.activeConnections}\n\n`;

        // Uptime
        output += '# HELP process_uptime_seconds Process uptime in seconds\n';
        output += '# TYPE process_uptime_seconds counter\n';
        output += `process_uptime_seconds ${metrics.uptime}\n\n`;

        // Memory
        output += '# HELP process_memory_bytes Process memory usage in bytes\n';
        output += '# TYPE process_memory_bytes gauge\n';
        output += `process_memory_bytes{type="heap_used"} ${metrics.memory.heapUsed}\n`;
        output += `process_memory_bytes{type="heap_total"} ${metrics.memory.heapTotal}\n`;
        output += `process_memory_bytes{type="external"} ${metrics.memory.external}\n`;
        output += `process_memory_bytes{type="rss"} ${metrics.memory.rss}\n`;

        return output;
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.requestCount = 0;
        this.requestsByMethod.clear();
        this.requestsByStatus.clear();
        this.requestsByPath.clear();
        this.responseTimes = [];
        this.errorCount = 0;
        this.errorsByType.clear();
    }
}

// Global metrics instance
const globalMetrics = new Metrics();

/**
 * Metrics collection middleware
 */
export function metricsMiddleware(): Handler {
    return async (req: Request, res: Response, next: Function) => {
        const startTime = Date.now();

        globalMetrics.incrementConnections();

        // Capture response
        const originalEnd = res.end.bind(res);
        res.end = function (chunk?: any, encoding?: any, callback?: any): any {
            const responseTime = Date.now() - startTime;
            const path = (req as any).path || req.url || '/';

            globalMetrics.recordRequest(
                req.method || 'GET',
                path,
                res.statusCode,
                responseTime
            );

            globalMetrics.decrementConnections();

            return originalEnd(chunk, encoding, callback);
        };

        next();
    };
}

/**
 * Metrics endpoint handler
 */
export function metricsHandler(format: 'json' | 'prometheus' = 'json') {
    return (req: Request, res: Response) => {
        if (format === 'prometheus') {
            res.setHeader('Content-Type', 'text/plain; version=0.0.4');
            res.send(globalMetrics.getPrometheusMetrics());
        } else {
            res.json(globalMetrics.getMetrics());
        }
    };
}

/**
 * Get global metrics instance
 */
export function getMetrics(): Metrics {
    return globalMetrics;
}
