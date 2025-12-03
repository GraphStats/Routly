"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bodyParser = void 0;
exports.bodyParser = {
    json: () => (req, res, next) => {
        if (req.headers['content-type'] !== 'application/json') {
            return next();
        }
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            try {
                req.body = JSON.parse(data);
            }
            catch (e) {
                req.body = {};
                console.error('Error parsing JSON body', e);
            }
            next();
        });
    }
};
