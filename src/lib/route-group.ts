import { Router, Handler } from './router';

export class RouteGroup {
    constructor(private prefix: string, private router: Router) { }

    use(path: string, handler: Handler) {
        this.router.use(this.prefix + path, handler);
    }

    get(path: string, handler: Handler) {
        this.router.add('GET', this.prefix + path, handler);
    }

    post(path: string, handler: Handler) {
        this.router.add('POST', this.prefix + path, handler);
    }

    put(path: string, handler: Handler) {
        this.router.add('PUT', this.prefix + path, handler);
    }

    delete(path: string, handler: Handler) {
        this.router.add('DELETE', this.prefix + path, handler);
    }

    patch(path: string, handler: Handler) {
        this.router.add('PATCH', this.prefix + path, handler);
    }

    options(path: string, handler: Handler) {
        this.router.add('OPTIONS', this.prefix + path, handler);
    }
}
