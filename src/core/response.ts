import { ServerResponse } from 'http';
import * as stream from 'stream';

export interface Response extends ServerResponse {
    app?: any;
    locals?: any;
    status(code: number): this;
    json(body: any): void;
    jsonp(body: any): void;
    send(body: string | Buffer): void;
    redirect(url: string, status?: number): void;
    cookie(name: string, value: string, options?: CookieOptions): this;
    sendFile(path: string): void;
    download(path: string, filename?: string, callback?: (err?: Error) => void): void;
    attachment(filename?: string): this;
    links(links: { [key: string]: string }): this;
    location(url: string): this;
    render(view: string, options?: any, callback?: (err: Error | null, html: string) => void): void;
    format(obj: { [key: string]: () => void }): this;
    sse(data: any, event?: string, id?: string): this;
    paginate(data: any[], metadata: PaginationMetadata): void;
    transform(transformer: ResponseTransformer): this;
    stream(readableStream: stream.Readable, contentType?: string): void;
}

export interface PaginationMetadata {
    total: number;
    page: number;
    perPage: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
}

export type ResponseTransformer = (data: any) => any;

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
    response.locals = {};

    // Response transformers pipeline
    const transformers: ResponseTransformer[] = [];

    response.status = function (code: number) {
        this.statusCode = code;
        return this;
    };

    response.json = function (body: any) {
        // Apply transformers
        let transformedBody = body;
        for (const transformer of transformers) {
            transformedBody = transformer(transformedBody);
        }

        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(transformedBody));
    };

    response.jsonp = function (body: any) {
        this.setHeader('Content-Type', 'application/json');
        // Simple JSONP implementation
        // Need access to req to get callback name, but enhanceResponse only has res.
        // We will assume 'callback' query param is handled in the handler or we need to attach req to res.
        // For now, just standard JSON.
        this.end(JSON.stringify(body));
    };

    response.send = function (body: string | Buffer) {
        // Auto-detect content type if not set
        if (!this.getHeader('Content-Type')) {
            if (typeof body === 'string') {
                // Try to detect JSON
                if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                    this.setHeader('Content-Type', 'application/json');
                }
                // Try to detect HTML
                else if (body.trim().startsWith('<')) {
                    this.setHeader('Content-Type', 'text/html');
                }
                // Default to plain text
                else {
                    this.setHeader('Content-Type', 'text/plain');
                }
            } else {
                this.setHeader('Content-Type', 'application/octet-stream');
            }
        }

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
        const mime = require('../utils/mime-types');

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

    response.download = function (filePath: string, filename?: string, callback?: (err?: Error) => void) {
        const path = require('path');
        const name = filename || path.basename(filePath);
        this.setHeader('Content-Disposition', `attachment; filename="${name}"`);
        this.sendFile(filePath);
    };

    response.attachment = function (filename?: string) {
        if (filename) {
            this.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        } else {
            this.setHeader('Content-Disposition', 'attachment');
        }
        return this;
    };

    response.links = function (links: { [key: string]: string }) {
        let link = this.getHeader('Link') || '';
        if (link) link += ', ';
        link += Object.keys(links).map(rel => `<${links[rel]}>; rel="${rel}"`).join(', ');
        this.setHeader('Link', link);
        return this;
    };

    response.location = function (url: string) {
        this.setHeader('Location', url);
        return this;
    };

    response.render = function (view: string, options: any = {}, callback?: (err: Error | null, html: string) => void) {
        if (this.app && this.app.render) {
            this.app.render(view, { ...this.locals, ...options }, (err: Error | null, html: string) => {
                if (err) {
                    if (callback) return callback(err, '');
                    throw err; // Or handle default error
                }
                if (callback) return callback(null, html);
                this.send(html);
            });
        } else {
            throw new Error('No render engine available');
        }
    };

    response.format = function (obj: { [key: string]: () => void }) {
        // Simple content negotiation
        // Need req.accepts to be fully functional
        // For now, just pick the first one or default
        const keys = Object.keys(obj);
        if (keys.length > 0) {
            obj[keys[0]]();
        }
        return this;
    };

    /**
     * Server-Sent Events (SSE) support
     */
    response.sse = function (data: any, event?: string, id?: string) {
        // Set headers for SSE
        if (!this.headersSent) {
            this.setHeader('Content-Type', 'text/event-stream');
            this.setHeader('Cache-Control', 'no-cache');
            this.setHeader('Connection', 'keep-alive');
            this.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
        }

        let message = '';

        if (id) {
            message += `id: ${id}\n`;
        }

        if (event) {
            message += `event: ${event}\n`;
        }

        const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
        message += `data: ${dataStr}\n\n`;

        this.write(message);
        return this;
    };

    /**
     * Pagination helper
     */
    response.paginate = function (data: any[], metadata: PaginationMetadata) {
        const { total, page, perPage } = metadata;
        const totalPages = Math.ceil(total / perPage);
        const hasNext = page < totalPages;
        const hasPrev = page > 1;

        // Add Link header for pagination
        const baseUrl = (this as any).req?.url?.split('?')[0] || '';
        const links: { [key: string]: string } = {};

        if (hasNext) {
            links.next = `${baseUrl}?page=${page + 1}&perPage=${perPage}`;
            links.last = `${baseUrl}?page=${totalPages}&perPage=${perPage}`;
        }

        if (hasPrev) {
            links.prev = `${baseUrl}?page=${page - 1}&perPage=${perPage}`;
            links.first = `${baseUrl}?page=1&perPage=${perPage}`;
        }

        if (Object.keys(links).length > 0) {
            this.links(links);
        }

        // Send paginated response
        this.json({
            data,
            pagination: {
                total,
                page,
                perPage,
                totalPages,
                hasNext,
                hasPrev
            }
        });
    };

    /**
     * Add response transformer
     */
    response.transform = function (transformer: ResponseTransformer) {
        transformers.push(transformer);
        return this;
    };

    /**
     * Stream a readable stream to response
     */
    response.stream = function (readableStream: stream.Readable, contentType?: string) {
        if (contentType) {
            this.setHeader('Content-Type', contentType);
        }

        readableStream.pipe(this);
    };

    return response;
}
