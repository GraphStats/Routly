"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const logger = () => {
    return (req, res, next) => {
        const start = Date.now();
        const { method, url } = req;
        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            // Simple console log, can be enhanced
            console.log(`${new Date().toISOString()} - ${method} ${url} ${status} - ${duration}ms`);
        });
        next();
    };
};
exports.logger = logger;
