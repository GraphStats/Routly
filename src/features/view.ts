export interface ViewEngine {
    render(filePath: string, options: any, callback: (err: Error | null, rendered?: string) => void): void;
}

export class View {
    name: string;
    path: string;
    engine: ViewEngine;

    constructor(name: string, options: { defaultEngine: string; root: string; engines: { [key: string]: ViewEngine } }) {
        this.name = name;
        this.path = name; // Simplify path resolution for now
        // In a real app, we would resolve path using options.root

        const ext = name.split('.').pop() || options.defaultEngine;
        this.engine = options.engines['.' + ext] || options.engines[ext];
    }

    render(options: any, callback: (err: Error | null, rendered?: string) => void) {
        if (!this.engine) {
            return callback(new Error(`No engine registered for view ${this.name}`));
        }
        this.engine.render(this.path, options, callback);
    }
}
