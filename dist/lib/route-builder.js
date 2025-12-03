"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteBuilder = void 0;
/**
 * RouteBuilder provides a fluent API for defining routes
 * Example: app.route('/users').get(handler).post(handler)
 */
class RouteBuilder {
    constructor(path, router) {
        this.path = path;
        this.router = router;
    }
    /**
     * Define a GET handler for this route
     */
    get(handler) {
        this.router.add('GET', this.path, handler);
        return this;
    }
    /**
     * Define a POST handler for this route
     */
    post(handler) {
        this.router.add('POST', this.path, handler);
        return this;
    }
    /**
     * Define a PUT handler for this route
     */
    put(handler) {
        this.router.add('PUT', this.path, handler);
        return this;
    }
    /**
     * Define a DELETE handler for this route
     */
    delete(handler) {
        this.router.add('DELETE', this.path, handler);
        return this;
    }
    /**
     * Define a PATCH handler for this route
     */
    patch(handler) {
        this.router.add('PATCH', this.path, handler);
        return this;
    }
    /**
     * Define an OPTIONS handler for this route
     */
    options(handler) {
        this.router.add('OPTIONS', this.path, handler);
        return this;
    }
}
exports.RouteBuilder = RouteBuilder;
