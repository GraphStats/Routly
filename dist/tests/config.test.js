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
const index_1 = require("../src/index");
const http = __importStar(require("http"));
// Mock the config file to ensure we have known values for testing if needed,
// but for now we will test against the actual file as requested.
// We can also just check if it matches what we expect from the default file.
describe('Configuration System', () => {
    it('should expose configuration via Routly.config', () => {
        const config = index_1.Routly.config;
        expect(config).toBeDefined();
        expect(config.port).toBeDefined();
        expect(config.host).toBeDefined();
        expect(config.subdomainRouting).toBeDefined();
    });
    it('should have default port 3000', () => {
        expect(index_1.Routly.config.port).toBe(3000);
    });
    it('should use configured port when starting without arguments', () => {
        const app = new index_1.Routly();
        const listenSpy = jest.spyOn(http.Server.prototype, 'listen').mockImplementation((...args) => {
            const [port, host, callback] = args;
            if (typeof host === 'function') {
                // callback is host
            }
            if (typeof port === 'function') {
                // callback is port
            }
            return {};
        });
        app.start();
        expect(listenSpy).toHaveBeenCalled();
        // The first argument to listen should be the port from config
        expect(listenSpy.mock.calls[0][0]).toBe(3000);
        listenSpy.mockRestore();
    });
});
