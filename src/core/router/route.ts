import { ParamConstraint, ParamConstraints } from './types';

export interface Route {
    name(name: string): this;
    alias(path: string | string[]): this;
    constraint(param: string, constraint: ParamConstraint): this;
    constraints(constraints: ParamConstraints): this;
}
