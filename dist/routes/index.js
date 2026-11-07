"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const exam_routes_1 = __importDefault(require("./exam.routes"));
const test_routes_1 = __importDefault(require("./test.routes"));
const question_routes_1 = __importDefault(require("./question.routes"));
const attempt_routes_1 = __importDefault(require("./attempt.routes"));
const practice_routes_1 = __importDefault(require("./practice.routes"));
const update_routes_1 = __importDefault(require("./update.routes"));
const admin_routes_1 = __importDefault(require("./admin.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/exams', exam_routes_1.default);
router.use('/tests', test_routes_1.default);
router.use('/questions', question_routes_1.default);
router.use('/attempts', attempt_routes_1.default);
router.use('/practice', practice_routes_1.default);
router.use('/updates', update_routes_1.default);
router.use('/admin', admin_routes_1.default);
// Health check endpoint
router.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'AR Career Point Backend API',
        database: 'PostgreSQL + Prisma',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
