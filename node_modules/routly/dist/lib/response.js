"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceResponse = enhanceResponse;
function enhanceResponse(res) {
    const response = res;
    response.status = function (code) {
        this.statusCode = code;
        return this;
    };
    response.json = function (body) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(body));
    };
    response.send = function (body) {
        this.end(body);
    };
    response.redirect = function (url, status = 302) {
        this.statusCode = status;
        this.setHeader('Location', url);
        this.end();
    };
    response.cookie = function (name, value, options = {}) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        if (options.maxAge)
            cookie += `; Max-Age=${options.maxAge}`;
        if (options.expires)
            cookie += `; Expires=${options.expires.toUTCString()}`;
        if (options.path)
            cookie += `; Path=${options.path}`;
        if (options.domain)
            cookie += `; Domain=${options.domain}`;
        if (options.secure)
            cookie += '; Secure';
        if (options.httpOnly)
            cookie += '; HttpOnly';
        if (options.sameSite)
            cookie += `; SameSite=${options.sameSite}`;
        const existingCookies = this.getHeader('Set-Cookie') || [];
        const cookies = Array.isArray(existingCookies)
            ? existingCookies
            : [existingCookies];
        cookies.push(cookie);
        this.setHeader('Set-Cookie', cookies);
        return this;
    };
    response.sendFile = function (filePath) {
        const fs = require('fs');
        const path = require('path');
        const mime = require('./mime-types');
        const ext = path.extname(filePath).slice(1);
        const contentType = mime.getType(ext) || 'application/octet-stream';
        fs.stat(filePath, (err, stats) => {
            if (err) {
                this.statusCode = 404;
                this.end('File not found');
                return;
            }
            this.setHeader('Content-Type', contentType);
            this.setHeader('Content-Length', stats.size);
            const stream = fs.createReadStream(filePath);
            stream.pipe(this);
        });
    };
    return response;
}
