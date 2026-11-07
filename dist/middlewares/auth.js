"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSuperAdmin = exports.requireAdmin = exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const prisma_1 = require("../lib/prisma");
const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'अनधिकृत: कृपया वैध टोकन प्रदान करें (Authorization token required)',
        });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = (0, jwt_1.verifyToken)(token);
        const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            return res.status(401).json({ success: false, message: 'Account no longer exists' });
        req.user = { userId: user.id, email: user.email, role: user.role };
        next();
    }
    catch (error) {
        if (error instanceof Error && !['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
            return next(error);
        }
        return res.status(401).json({
            success: false,
            message: 'अमान्य या समाप्त टोकन (Invalid or expired token)',
        });
    }
};
exports.authenticate = authenticate;
const requireAdmin = (req, res, next) => {
    if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: 'निषेध: यह कार्रवाई केवल व्यवस्थापक (Admin) के लिए अनुमत है',
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireSuperAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'SUPERADMIN') {
        return res.status(403).json({ success: false, message: 'This action is restricted to superadmins.' });
    }
    next();
};
exports.requireSuperAdmin = requireSuperAdmin;
