import { IncomingMessage } from 'http';

export interface Request extends IncomingMessage {
    query: { [key: string]: string | string[] | undefined };
    body?: any;
    params: { [key: string]: string };
    cookies?: { [key: string]: string };
    ip?: string;
    path?: string;
    protocol?: string;

    // Auth
    user?: any;
    token?: string;
    session?: any;

    // Uploads
    files?: any;

    // Misc
    userAgent?: string;

    // Geolocation
    geo?: {
        country?: string;
        city?: string;
        region?: string;
        latitude?: number;
        longitude?: number;
        timezone?: string;
    };

    // Fingerprinting
    fingerprint?: string;

    // Helper methods
    is(type: string): boolean;
    get(header: string): string | string[] | undefined;
    accepts(...types: string[]): string | false;
}
