"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, {
        expiresIn: config_1.config.jwtExpiresIn,
    });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.userId !== 'string' ||
        typeof payload.email !== 'string' || !['STUDENT', 'ADMIN', 'SUPERADMIN'].includes(payload.role)) {
        throw new jsonwebtoken_1.default.JsonWebTokenError('Invalid token payload');
    }
    return payload;
};
exports.verifyToken = verifyToken;
