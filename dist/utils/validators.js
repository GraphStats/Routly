"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = void 0;
exports.validate = validate;
function validateValue(value, rule, fieldName) {
    // Check required
    if (rule.required && (value === undefined || value === null || value === '')) {
        return {
            field: fieldName,
            message: rule.message || `${fieldName} is required`,
        };
    }
    // If not required and value is empty, skip other validations
    if (!rule.required && (value === undefined || value === null || value === '')) {
        return null;
    }
    // Type validation
    if (rule.type) {
        switch (rule.type) {
            case 'string':
                if (typeof value !== 'string') {
                    return { field: fieldName, message: rule.message || `${fieldName} must be a string` };
                }
                break;
            case 'number':
                if (typeof value !== 'number' && isNaN(Number(value))) {
                    return { field: fieldName, message: rule.message || `${fieldName} must be a number` };
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { field: fieldName, message: rule.message || `${fieldName} must be a boolean` };
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { field: fieldName, message: rule.message || `${fieldName} must be a valid email` };
                }
                break;
            case 'url':
                try {
                    new URL(value);
                }
                catch {
                    return { field: fieldName, message: rule.message || `${fieldName} must be a valid URL` };
                }
                break;
            case 'array':
                if (!Array.isArray(value)) {
                    return { field: fieldName, message: rule.message || `${fieldName} must be an array` };
                }
                break;
            case 'object':
                if (typeof value !== 'object' || Array.isArray(value)) {
                    return { field: fieldName, message: rule.message || `${fieldName} must be an object` };
                }
                break;
        }
    }
    // Min/Max validation
    if (rule.min !== undefined) {
        if (typeof value === 'string' || Array.isArray(value)) {
            if (value.length < rule.min) {
                return { field: fieldName, message: rule.message || `${fieldName} must have at least ${rule.min} characters/items` };
            }
        }
        else if (typeof value === 'number') {
            if (value < rule.min) {
                return { field: fieldName, message: rule.message || `${fieldName} must be at least ${rule.min}` };
            }
        }
    }
    if (rule.max !== undefined) {
        if (typeof value === 'string' || Array.isArray(value)) {
            if (value.length > rule.max) {
                return { field: fieldName, message: rule.message || `${fieldName} must have at most ${rule.max} characters/items` };
            }
        }
        else if (typeof value === 'number') {
            if (value > rule.max) {
                return { field: fieldName, message: rule.message || `${fieldName} must be at most ${rule.max}` };
            }
        }
    }
    // Pattern validation
    if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
            return { field: fieldName, message: rule.message || `${fieldName} has invalid format` };
        }
    }
    // Custom validation
    if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
            return {
                field: fieldName,
                message: typeof result === 'string' ? result : (rule.message || `${fieldName} is invalid`),
            };
        }
    }
    return null;
}
function validate(source, schema) {
    return (req, res, next) => {
        const data = req[source] || {};
        const errors = [];
        for (const [field, rule] of Object.entries(schema)) {
            const error = validateValue(data[field], rule, field);
            if (error) {
                errors.push(error);
            }
        }
        if (errors.length > 0) {
            res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
            return;
        }
        next();
    };
}
// Convenience validators
exports.validators = {
    body: (schema) => validate('body', schema),
    query: (schema) => validate('query', schema),
    params: (schema) => validate('params', schema),
};
