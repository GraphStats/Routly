import { IncomingMessage } from 'http';

export interface Request extends IncomingMessage {
    query: { [key: string]: string | string[] | undefined };
    body?: any;
    params: { [key: string]: string };
}
