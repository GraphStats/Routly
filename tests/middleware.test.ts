import request from 'supertest';
import { Routly, bodyParser, cors } from '../src/index';
import { Server } from 'http';

describe('Routly Middleware', () => {
    let app: Routly;
    let server: Server;

    beforeEach(() => {
        app = new Routly();
    });

    afterEach((done) => {
        if (server) {
            server.close(done);
        } else {
            done();
        }
    });


    it('should execute middleware in order', async () => {
        const order: number[] = [];
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
        await new Promise<void>(resolve => {
            if (server.listening) return resolve();
            server.on('listening', resolve);
        });
        await request(server).get('/');
        expect(order).toEqual([1, 2, 3]);
    });

    it('should parse JSON body using bodyParser', async () => {
        app.use('/', bodyParser.json());
        app.post('/', (req, res) => {
            res.json(req.body);
        });

        server = app.listen(0);
        await new Promise<void>(resolve => {
            if (server.listening) return resolve();
            server.on('listening', resolve);
        });
        const response = await request(server)
            .post('/')
            .send({ foo: 'bar' });

        expect(response.body).toEqual({ foo: 'bar' });
    });

    it('should handle CORS', async () => {
        app.use('/', cors());
        app.get('/', (req, res) => res.send('ok'));

        server = app.listen(0);
        await new Promise<void>(resolve => {
            if (server.listening) return resolve();
            server.on('listening', resolve);
        });
        const response = await request(server).get('/');
        expect(response.headers['access-control-allow-origin']).toBe('*');
    });
});
