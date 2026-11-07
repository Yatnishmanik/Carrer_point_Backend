"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteManagedUser = exports.updateManagedUser = exports.createManagedUser = exports.getAdminOverview = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const userFields = { id: true, name: true, email: true, phone: true, targetExam: true, role: true, createdAt: true };
const manageableRoles = [client_1.Role.ADMIN, client_1.Role.STUDENT];
const getAdminOverview = async (req, res, next) => {
    try {
        const [users, tests, questions] = await Promise.all([
            prisma_1.prisma.user.findMany({
                select: req.user?.role === 'SUPERADMIN' ? userFields : { id: true, name: true, email: true, role: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.test.count(),
            prisma_1.prisma.question.count(),
        ]);
        res.json({ success: true, data: { users, totalUsers: await prisma_1.prisma.user.count(), totalTests: tests, totalQuestions: questions } });
    }
    catch (error) {
        next(error);
    }
};
exports.getAdminOverview = getAdminOverview;
const createManagedUser = async (req, res, next) => {
    try {
        const { name, email, password, role, phone, targetExam } = req.body;
        if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' ||
            password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 || !manageableRoles.includes(role) ||
            (phone !== undefined && typeof phone !== 'string') || (targetExam !== undefined && typeof targetExam !== 'string')) {
            return res.status(400).json({ success: false, message: 'Provide a name, valid email, password (8–72 bytes), and role ADMIN or STUDENT.' });
        }
        const user = await prisma_1.prisma.user.create({
            data: { name: name.trim(), email: email.toLowerCase().trim(), password: await bcryptjs_1.default.hash(password, 10), role, phone: phone?.trim() || null, targetExam: targetExam?.trim() || null },
            select: userFields,
        });
        res.status(201).json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.createManagedUser = createManagedUser;
const updateManagedUser = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { name, email, password, role, phone, targetExam } = req.body;
        const existing = await prisma_1.prisma.user.findUnique({ where: { id } });
        if (!existing || (existing.role !== client_1.Role.ADMIN && existing.role !== client_1.Role.STUDENT))
            return res.status(404).json({ success: false, message: 'User not found.' });
        if ((name !== undefined && (typeof name !== 'string' || !name.trim())) ||
            (email !== undefined && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) ||
            (role !== undefined && !manageableRoles.includes(role)) ||
            (password !== undefined && (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72)) ||
            (phone !== undefined && phone !== null && typeof phone !== 'string') ||
            (targetExam !== undefined && targetExam !== null && typeof targetExam !== 'string')) {
            return res.status(400).json({ success: false, message: 'One or more user fields are invalid.' });
        }
        const data = {
            ...(name !== undefined ? { name: name.trim() } : {}),
            ...(email !== undefined ? { email: email.toLowerCase().trim() } : {}),
            ...(role !== undefined ? { role } : {}),
            ...(password !== undefined ? { password: await bcryptjs_1.default.hash(password, 10) } : {}),
            ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
            ...(targetExam !== undefined ? { targetExam: targetExam?.trim() || null } : {}),
        };
        const user = await prisma_1.prisma.user.update({ where: { id }, data, select: userFields });
        res.json({ success: true, data: user });
    }
    catch (error) {
        next(error);
    }
};
exports.updateManagedUser = updateManagedUser;
const deleteManagedUser = async (req, res, next) => {
    try {
        const id = String(req.params.id);
        if (id === req.user?.userId)
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        const existing = await prisma_1.prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'User not found.' });
        const allowedRoles = req.user?.role === 'SUPERADMIN' ? manageableRoles : [client_1.Role.STUDENT];
        if (!allowedRoles.some(role => role === existing.role))
            return res.status(403).json({ success: false, message: 'You cannot remove this account.' });
        const deleted = await prisma_1.prisma.user.deleteMany({ where: { id, role: { in: allowedRoles } } });
        if (!deleted.count)
            return res.status(409).json({ success: false, message: 'The account role changed. Refresh the user list.' });
        res.json({ success: true, data: { id } });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteManagedUser = deleteManagedUser;
