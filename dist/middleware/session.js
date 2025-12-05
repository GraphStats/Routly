"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.session = void 0;
const crypto = __importStar(require("crypto"));
class MemoryStore {
    constructor() {
        this.sessions = {};
    }
    get(sid) { return this.sessions[sid]; }
    set(sid, session) { this.sessions[sid] = session; }
    destroy(sid) { delete this.sessions[sid]; }
}
const session = (options = { secret: 'secret' }) => {
    const store = options.store || new MemoryStore();
    const cookieName = 'connect.sid';
    return (req, res, next) => {
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
        req.session = sess;
        // Save session on end
        const originalEnd = res.end;
        res.end = function (chunk, encoding, cb) {
            store.set(sid, sess);
            return originalEnd.call(this, chunk, encoding, cb);
        };
        next();
    };
};
exports.session = session;
