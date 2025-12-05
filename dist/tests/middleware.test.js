"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
describe('Routly Middleware', () => {
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
    it('should execute middleware in order', async () => {
        const order = [];
        app.use('/', (req, res, next) => {
            order.push(1);
            next();
        });
        app.use('/', (req, res, next) => {
            order.push(2);
            next();
        });
        app.get('/', (req, res) => {
            order.push(3);
            res.send('done');
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        await (0, supertest_1.default)(server).get('/');
        expect(order).toEqual([1, 2, 3]);
    });
    it('should parse JSON body using bodyParser', async () => {
        app.use('/', index_1.bodyParser.json());
        app.post('/', (req, res) => {
            res.json(req.body);
        });
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server)
            .post('/')
            .send({ foo: 'bar' });
        expect(response.body).toEqual({ foo: 'bar' });
    });
    it('should handle CORS', async () => {
        app.use('/', (0, index_1.cors)());
        app.get('/', (req, res) => res.send('ok'));
        server = app.listen(0);
        await new Promise(resolve => {
            if (server.listening)
                return resolve();
            server.on('listening', resolve);
        });
        const response = await (0, supertest_1.default)(server).get('/');
        expect(response.headers['access-control-allow-origin']).toBe('*');
    });
});
