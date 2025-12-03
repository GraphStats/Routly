import { IncomingMessage } from 'http';

export interface Request extends IncomingMessage {
    query: { [key: string]: string | string[] | undefined };
    body?: any;
    params: { [key: string]: string };
    cookies?: { [key: string]: string };
    ip?: string;

    // Helper methods
    is(type: string): boolean;
    get(header: string): string | string[] | undefined;
    accepts(...types: string[]): string | false;
}
