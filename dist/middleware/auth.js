"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bearerToken = exports.basicAuth = void 0;
const basicAuth = (validate) => {
    return async (req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Basic ')) {
            res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            res.statusCode = 401;
            res.end('Unauthorized');
            return;
        }
        const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
        const user = credentials[0];
        const pass = credentials[1];
        if (await validate(user, pass)) {
            req.user = { name: user };
            next();
        }
        else {
            res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
            res.statusCode = 401;
            res.end('Unauthorized');
        }
    };
};
exports.basicAuth = basicAuth;
const bearerToken = () => {
    return (req, res, next) => {
        const auth = req.headers.authorization;
        if (auth && auth.startsWith('Bearer ')) {
            req.token = auth.split(' ')[1];
        }
        next();
    };
};
exports.bearerToken = bearerToken;
