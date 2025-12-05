import { Routly } from '../src/index';
import * as http from 'http';

// Mock the config file to ensure we have known values for testing if needed,
// but for now we will test against the actual file as requested.
// We can also just check if it matches what we expect from the default file.

describe('Configuration System', () => {
    it('should expose configuration via Routly.config', () => {
        const config = Routly.config;
        expect(config).toBeDefined();
        expect(config.port).toBeDefined();
        expect(config.host).toBeDefined();
        expect(config.subdomainRouting).toBeDefined();
    });

    it('should have default port 3000', () => {
        expect(Routly.config.port).toBe(3000);
    });

    it('should use configured port when starting without arguments', () => {
        const app = new Routly();
        const listenSpy = jest.spyOn(http.Server.prototype, 'listen').mockImplementation((...args: any[]) => {
            const [port, host, callback] = args;
            if (typeof host === 'function') {
                // callback is host
            }
            if (typeof port === 'function') {
                // callback is port
            }
            return {} as any;
        });

        app.start();

        expect(listenSpy).toHaveBeenCalled();
        // The first argument to listen should be the port from config
        expect(listenSpy.mock.calls[0][0]).toBe(3000);

        listenSpy.mockRestore();
    });
});
