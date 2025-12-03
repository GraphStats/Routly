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
    return response;
}
