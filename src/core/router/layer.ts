import { Handler, ParamConstraints } from './types';

export interface Layer {
    method?: string; // If undefined, it matches all methods (middleware)
    path: string | RegExp;
    handler: Handler;
    isMiddleware: boolean;
    keys: string[];
    regexp: RegExp;
    name?: string;
    constraints?: ParamConstraints;
    aliases?: string[];
}
