import { Request } from '../core/request';
import { Response } from '../core/response';
import { NextFunction } from '../core/router';
import * as crypto from 'crypto';

interface SessionStore {
    get(sid: string): any;
    set(sid: string, session: any): void;
    destroy(sid: string): void;
}

class MemoryStore implements SessionStore {
    private sessions: { [key: string]: any } = {};
    get(sid: string) { return this.sessions[sid]; }
    set(sid: string, session: any) { this.sessions[sid] = session; }
    destroy(sid: string) { delete this.sessions[sid]; }
}

export const session = (options: { secret: string; store?: SessionStore; cookie?: any } = { secret: 'secret' }) => {
    const store = options.store || new MemoryStore();
    const cookieName = 'connect.sid';

    return (req: Request, res: Response, next: NextFunction) => {
        let sid = req.cookies && req.cookies[cookieName];

        if (!sid) {
            sid = crypto.randomUUID();
            // Set cookie
            res.cookie(cookieName, sid, options.cookie || { httpOnly: true });
        }

        let sess = store.get(sid);
        if (!sess) {
            sess = {};
            store.set(sid, sess);
        }

        (req as any).session = sess;

        // Save session on end
        const originalEnd = res.end;
        res.end = function (this: Response, chunk?: any, encoding?: any, cb?: any) {
            store.set(sid, sess);
            return originalEnd.call(this, chunk, encoding, cb);
        } as any;

        next();
    };
};
