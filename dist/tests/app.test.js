"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Routly App', () => {
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
    it('should handle a basic GET request', async () => {
        app.get('/', (req, res) => {
            res.send('Hello World');
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/');
        expect(response.status).toBe(200);
        expect(response.text).toBe('Hello World');
    });
    it('should handle a basic POST request with JSON body', async () => {
        app.use('/', (req, res, next) => {
            let data = '';
            req.on('data', chunk => data += chunk);
            req.on('end', () => {
                if (data)
                    req.body = JSON.parse(data);
                next();
            });
        });
        app.post('/data', (req, res) => {
            res.json(req.body);
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server)
            .post('/data')
            .send({ test: 'data' });
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ test: 'data' });
    });
    it('should return 404 for unknown routes', async () => {
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/unknown');
        expect(response.status).toBe(404);
    });
});
