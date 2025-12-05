"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceResponse = enhanceResponse;
function enhanceResponse(res) {
    const response = res;
    response.locals = {};
    response.status = function (code) {
        this.statusCode = code;
        return this;
    };
    response.json = function (body) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(body));
    };
    response.jsonp = function (body) {
        this.setHeader('Content-Type', 'application/json');
        // Simple JSONP implementation
        // Need access to req to get callback name, but enhanceResponse only has res.
        // We will assume 'callback' query param is handled in the handler or we need to attach req to res.
        // For now, just standard JSON.
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
    response.download = function (filePath, filename, callback) {
        const path = require('path');
        const name = filename || path.basename(filePath);
        this.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        this.sendFile(filePath);
    };
    response.attachment = function (filename) {
        if (filename) {
            this.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        }
        else {
            this.setHeader('Content-Disposition', 'attachment');
        }
        return this;
    };
    response.links = function (links) {
        let link = this.getHeader('Link') || '';
        if (link)
            link += ', ';
        link += Object.keys(links).map(rel => `<${links[rel]}>; rel="${rel}"`).join(', ');
        this.setHeader('Link', link);
        return this;
    };
    response.location = function (url) {
        this.setHeader('Location', url);
        return this;
    };
    response.render = function (view, options = {}, callback) {
        if (this.app && this.app.render) {
            this.app.render(view, { ...this.locals, ...options }, (err, html) => {
                if (err) {
                    if (callback)
                        return callback(err, '');
                    throw err; // Or handle default error
                }
                if (callback)
                    return callback(null, html);
                this.send(html);
            });
        }
        else {
            throw new Error('No render engine available');
        }
    };
    response.format = function (obj) {
        // Simple content negotiation
        // Need req.accepts to be fully functional
        // For now, just pick the first one or default
        const keys = Object.keys(obj);
        if (keys.length > 0) {
            obj[keys[0]]();
        }
        return this;
    };
    return response;
}
