"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, _req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_next) => {
    console.error('[Error Middleware]:', err);
    // Prisma unique constraint violation
    if (err.code === 'P2002') {
        return res.status(409).json({
            success: false,
            message: 'इस विवरण (ईमेल या आईडी) का रिकॉर्ड पहले से मौजूद है।',
        });
    }
    // Prisma record not found
    if (err.code === 'P2025') {
        return res.status(404).json({
            success: false,
            message: 'अनुरोधित रिकॉर्ड नहीं मिला।',
        });
    }
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
        success: false,
        message: statusCode >= 500 ? 'Internal server error' : err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};
exports.errorHandler = errorHandler;
