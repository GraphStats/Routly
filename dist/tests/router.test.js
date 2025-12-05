"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Routly Router', () => {
    let app;
    let server;
    beforeEach(() => {
        app = new index_1.Routly();
    });
    afterEach((done) => {
        if (server) {
            server.close(done);
        }
        else {
            done();
        }
    });
    it('should handle route parameters', async () => {
        app.get('/users/:id', (req, res) => {
            res.json({ id: req.params.id });
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/users/123');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ id: '123' });
    });
    it('should handle query parameters', async () => {
        app.get('/search', (req, res) => {
            res.json(req.query);
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/search?q=test&page=1');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ q: 'test', page: '1' });
    });
    it('should handle route groups', async () => {
        app.group('/api', (group) => {
            group.get('/test', (req, res) => {
                res.send('API Test');
            });
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/api/test');
        expect(response.status).toBe(200);
        expect(response.text).toBe('API Test');
    });
    it('should handle async handlers', async () => {
        app.get('/async', async (req, res) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            res.send('Async');
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/async');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Async');
    });
});
