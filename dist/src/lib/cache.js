"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
class Cache {
    constructor() {
        this.store = {};
    }
    set(key, value, ttl = 60000) {
        this.store[key] = {
            value,
            expires: Date.now() + ttl
        };
    }
    get(key) {
        const item = this.store[key];
        if (!item)
            return null;
        if (Date.now() > item.expires) {
            delete this.store[key];
            return null;
        }
        return item.value;
    }
    delete(key) {
        delete this.store[key];
    }
    keys() {
        return Object.keys(this.store);
    }
    del(key) {
        this.delete(key);
    }
    flush() {
        this.store = {};
    }
}
exports.Cache = Cache;
