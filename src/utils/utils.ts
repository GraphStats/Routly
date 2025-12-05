import { Server } from 'http';
import * as cluster from 'cluster';
import * as os from 'os';

export const env = (key: string, defaultValue: string = ''): string => {
    return process.env[key] || defaultValue;
};

export const gracefulShutdown = (server: Server, callback?: () => void) => {
    const signals = ['SIGTERM', 'SIGINT'];

    signals.forEach(signal => {
        process.on(signal, () => {
            console.log(`${signal} received: closing HTTP server`);
            server.close(() => {
                console.log('HTTP server closed');
                if (callback) callback();
                process.exit(0);
            });
        });
    });
};

export const runCluster = (workers: number = os.cpus().length, appStart: () => void) => {
    if ((cluster as any).isPrimary || (cluster as any).isMaster) {
        console.log(`Primary ${process.pid} is running`);

        // Fork workers.
        for (let i = 0; i < workers; i++) {
            (cluster as any).fork();
        }

        (cluster as any).on('exit', (worker: any, code: any, signal: any) => {
            console.log(`worker ${worker.process.pid} died`);
        });
    } else {
        appStart();
        console.log(`Worker ${process.pid} started`);
    }
};
