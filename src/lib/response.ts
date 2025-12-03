import { ServerResponse } from 'http';

export interface Response extends ServerResponse {
    status(code: number): this;
    json(body: any): void;
    send(body: string | Buffer): void;
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

    return response;
}
