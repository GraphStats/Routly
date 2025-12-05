"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhanceRequest = enhanceRequest;
function enhanceRequest(req) {
    const request = req;
    // Helper method to check content type
    request.is = function (type) {
        const contentType = this.headers['content-type'] || '';
        return contentType.includes(type);
    };
    // Helper method to get headers easily
    request.get = function (header) {
        const lowerHeader = header.toLowerCase();
        return this.headers[lowerHeader];
    };
    // Helper method for content negotiation
    request.accepts = function (...types) {
        const acceptHeader = this.headers['accept'] || '*/*';
        for (const type of types) {
            if (acceptHeader.includes(type) || acceptHeader.includes('*/*')) {
                return type;
            }
        }
        return false;
    };
    // Extract IP address
    request.ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        '';
    return request;
}
