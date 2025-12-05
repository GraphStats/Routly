"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCluster = exports.gracefulShutdown = exports.env = void 0;
const cluster = __importStar(require("cluster"));
const os = __importStar(require("os"));
const env = (key, defaultValue = '') => {
    return process.env[key] || defaultValue;
};
exports.env = env;
const gracefulShutdown = (server, callback) => {
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
        process.on(signal, () => {
            console.log(`${signal} received: closing HTTP server`);
            server.close(() => {
                console.log('HTTP server closed');
                if (callback)
                    callback();
                process.exit(0);
            });
        });
    });
};
exports.gracefulShutdown = gracefulShutdown;
const runCluster = (workers = os.cpus().length, appStart) => {
    if (cluster.isPrimary || cluster.isMaster) {
        console.log(`Primary ${process.pid} is running`);
        // Fork workers.
        for (let i = 0; i < workers; i++) {
            cluster.fork();
        }
        cluster.on('exit', (worker, code, signal) => {
            console.log(`worker ${worker.process.pid} died`);
        });
    }
    else {
        appStart();
        console.log(`Worker ${process.pid} started`);
    }
};
exports.runCluster = runCluster;
