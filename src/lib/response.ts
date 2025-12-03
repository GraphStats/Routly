import { ServerResponse } from 'http';

export interface Response extends ServerResponse {
    status(code: number): this;
    json(body: any): void;
    send(body: string | Buffer): void;
    redirect(url: string, status?: number): void;
    cookie(name: string, value: string, options?: CookieOptions): this;
    sendFile(path: string): void;
}

export interface CookieOptions {
    maxAge?: number;
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

export function enhanceResponse(res: ServerResponse): Response {
    const response = res as Response;

    response.status = function (code: number) {
        this.statusCode = code;
        return this;
    };

    response.json = function (body: any) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(body));
    };

    response.send = function (body: string | Buffer) {
        this.end(body);
    };

    response.redirect = function (url: string, status: number = 302) {
        this.statusCode = status;
        this.setHeader('Location', url);
        this.end();
    };

    response.cookie = function (name: string, value: string, options: CookieOptions = {}) {
        let cookie = `${name}=${encodeURIComponent(value)}`;

        if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
        if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`;
        if (options.path) cookie += `; Path=${options.path}`;
        if (options.domain) cookie += `; Domain=${options.domain}`;
        if (options.secure) cookie += '; Secure';
        if (options.httpOnly) cookie += '; HttpOnly';
        if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;

        const existingCookies = this.getHeader('Set-Cookie') || [];
        const cookies: string[] = Array.isArray(existingCookies)
            ? existingCookies as string[]
            : [existingCookies as string];
        cookies.push(cookie);
        this.setHeader('Set-Cookie', cookies);

        return this;
    };

    response.sendFile = function (filePath: string) {
        const fs = require('fs');
        const path = require('path');
        const mime = require('./mime-types');

        const ext = path.extname(filePath).slice(1);
        const contentType = mime.getType(ext) || 'application/octet-stream';

        fs.stat(filePath, (err: any, stats: any) => {
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
