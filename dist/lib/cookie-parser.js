"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cookieParser = cookieParser;
function cookieParser() {
    return (req, res, next) => {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
            req.cookies = {};
            next();
            return;
        }
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
            const [name, ...rest] = cookie.split('=');
            const value = rest.join('=');
            if (name && value) {
                cookies[name.trim()] = decodeURIComponent(value.trim());
            }
        });
        req.cookies = cookies;
        next();
    };
}
