import { IncomingMessage } from 'http';
import { Request } from './request';

export function enhanceRequest(req: IncomingMessage): Request {
    const request = req as Request;

    // Helper method to check content type
    request.is = function (type: string): boolean {
        const contentType = this.headers['content-type'] || '';
        return contentType.includes(type);
    };

    // Helper method to get headers easily
    request.get = function (header: string): string | string[] | undefined {
        const lowerHeader = header.toLowerCase();
        return this.headers[lowerHeader];
    };

    // Helper method for content negotiation
    request.accepts = function (...types: string[]): string | false {
        const acceptHeader = this.headers['accept'] || '*/*';

        for (const type of types) {
            if (acceptHeader.includes(type) || acceptHeader.includes('*/*')) {
                return type;
            }
        }
        return false;
    };

    // Extract IP address
    request.ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '';

    return request;
}
