"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouteGroup = void 0;
class RouteGroup {
    constructor(prefix, router) {
        this.prefix = prefix;
        this.router = router;
    }
    use(path, handler) {
        this.router.use(this.prefix + path, handler);
    }
    get(path, handler) {
        this.router.add('GET', this.prefix + path, handler);
    }
    post(path, handler) {
        this.router.add('POST', this.prefix + path, handler);
    }
    put(path, handler) {
        this.router.add('PUT', this.prefix + path, handler);
    }
    delete(path, handler) {
        this.router.add('DELETE', this.prefix + path, handler);
    }
    patch(path, handler) {
        this.router.add('PATCH', this.prefix + path, handler);
    }
    options(path, handler) {
        this.router.add('OPTIONS', this.prefix + path, handler);
    }
}
exports.RouteGroup = RouteGroup;
