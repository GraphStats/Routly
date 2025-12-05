"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
class View {
    constructor(name, options) {
        this.name = name;
        this.path = name; // Simplify path resolution for now
        // In a real app, we would resolve path using options.root
        const ext = name.split('.').pop() || options.defaultEngine;
        this.engine = options.engines['.' + ext] || options.engines[ext];
    }
    render(options, callback) {
        if (!this.engine) {
            return callback(new Error(`No engine registered for view ${this.name}`));
        }
        this.engine.render(this.path, options, callback);
    }
}
exports.View = View;
