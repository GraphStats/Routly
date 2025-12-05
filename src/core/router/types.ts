import { Request } from '../request';
import { Response } from '../response';

export type NextFunction = (err?: any) => void;
export type Handler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface ParamConstraint {
    pattern?: RegExp;
    type?: 'number' | 'uuid' | 'slug' | 'alpha' | 'alphanumeric';
    validator?: (value: string) => boolean;
}

export type ParamConstraints = Record<string, ParamConstraint>;
