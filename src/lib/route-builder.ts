import { Router, Handler } from './router';

/**
 * RouteBuilder provides a fluent API for defining routes
 * Example: app.route('/users').get(handler).post(handler)
 */
export class RouteBuilder {
    private path: string;
    private router: Router;

    constructor(path: string, router: Router) {
        this.path = path;
        this.router = router;
    }

    /**
     * Define a GET handler for this route
     */
    get(handler: Handler): RouteBuilder {
        this.router.add('GET', this.path, handler);
        return this;
    }

    /**
     * Define a POST handler for this route
     */
    post(handler: Handler): RouteBuilder {
        this.router.add('POST', this.path, handler);
        return this;
    }

    /**
     * Define a PUT handler for this route
     */
    put(handler: Handler): RouteBuilder {
        this.router.add('PUT', this.path, handler);
        return this;
    }

    /**
     * Define a DELETE handler for this route
     */
    delete(handler: Handler): RouteBuilder {
        this.router.add('DELETE', this.path, handler);
        return this;
    }

    /**
     * Define a PATCH handler for this route
     */
    patch(handler: Handler): RouteBuilder {
        this.router.add('PATCH', this.path, handler);
        return this;
    }

    /**
     * Define an OPTIONS handler for this route
     */
    options(handler: Handler): RouteBuilder {
        this.router.add('OPTIONS', this.path, handler);
        return this;
    }
}
