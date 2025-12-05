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
exports.verifySignature = verifySignature;
exports.verifyGitHubSignature = verifyGitHubSignature;
exports.verifyStripeSignature = verifyStripeSignature;
exports.generateSignature = generateSignature;
const crypto = __importStar(require("crypto"));
/**
 * Request signature verification middleware
 * Verify webhook signatures (GitHub, Stripe, etc.)
 */
function verifySignature(options) {
    const { secret, algorithm = 'sha256', header = 'x-hub-signature-256', prefix = 'sha256=', encoding = 'hex', onVerificationFailed = (req, res) => {
        res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid signature'
        });
    } } = options;
    return async (req, res, next) => {
        const signature = req.headers[header.toLowerCase()];
        if (!signature) {
            return onVerificationFailed(req, res);
        }
        // Get raw body
        const body = req.body;
        const payload = typeof body === 'string' ? body : JSON.stringify(body);
        // Calculate expected signature
        const hmac = crypto.createHmac(algorithm, secret);
        hmac.update(payload);
        const expectedSignature = prefix + hmac.digest(encoding);
        // Compare signatures (timing-safe)
        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);
        if (signatureBuffer.length !== expectedBuffer.length) {
            return onVerificationFailed(req, res);
        }
        const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
        if (!isValid) {
            return onVerificationFailed(req, res);
        }
        next();
    };
}
/**
 * GitHub webhook signature verification
 */
function verifyGitHubSignature(secret) {
    return verifySignature({
        secret,
        algorithm: 'sha256',
        header: 'x-hub-signature-256',
        prefix: 'sha256='
    });
}
/**
 * Stripe webhook signature verification
 */
function verifyStripeSignature(secret) {
    return verifySignature({
        secret,
        algorithm: 'sha256',
        header: 'stripe-signature',
        prefix: '',
        encoding: 'hex'
    });
}
/**
 * Generate signature for outgoing requests
 */
function generateSignature(payload, secret, algorithm = 'sha256', encoding = 'hex') {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(data);
    return hmac.digest(encoding);
}
