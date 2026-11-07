"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
const app = (0, express_1.default)();
// Middlewares
app.use((0, cors_1.default)({
    origin: [config_1.config.frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
}));
app.use('/api/questions/bulk', express_1.default.json({ limit: '3mb' }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Request Logger
app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
});
// Welcome Route
app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to AR Career Point Backend API',
        documentation: '/api/health',
        version: '1.0.0',
        stack: 'Node.js + Express + TypeScript + PostgreSQL + Prisma',
    });
});
// Mount Master API Router
app.use('/api', routes_1.default);
// 404 Handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'एपीआई एंडपॉइंट नहीं मिला (API Endpoint not found)',
    });
});
// Error Handling Middleware
app.use(errorHandler_1.errorHandler);
exports.default = app;
