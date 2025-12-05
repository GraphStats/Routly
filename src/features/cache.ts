export class Cache {
    private store: { [key: string]: { value: any; expires: number } } = {};

    set(key: string, value: any, ttl: number = 60000) { // ttl in ms
        this.store[key] = {
            value,
            expires: Date.now() + ttl
        };
    }

    get<T = any>(key: string): T | null {
        const item = this.store[key];
        if (!item) return null;

        if (Date.now() > item.expires) {
            delete this.store[key];
            return null;
        }

        return item.value as T;
    }

    delete(key: string) {
        delete this.store[key];
    }

    keys(): string[] {
        return Object.keys(this.store);
    }

    del(key: string) {
        this.delete(key);
    }

    flush() {
        this.store = {};
    }
}
