"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.login = exports.register = exports.checkAvailability = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
const jwt_1 = require("../utils/jwt");
const checkAvailability = async (req, res, next) => {
    try {
        const { username, email } = req.query;
        const checkingUsername = typeof username === 'string' && email === undefined;
        const checkingEmail = typeof email === 'string' && username === undefined;
        if ((!checkingUsername && !checkingEmail) ||
            (checkingUsername && !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) ||
            (checkingEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254))) {
            return res.status(400).json({ success: false, message: 'Provide a valid username or email.' });
        }
        const existing = await prisma_1.prisma.user.findUnique({
            where: checkingUsername ? { username: username.trim().toLowerCase() } : { email: email.trim().toLowerCase() },
            select: { id: true },
        });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: { available: !existing } });
    }
    catch (error) {
        next(error);
    }
};
exports.checkAvailability = checkAvailability;
const register = async (req, res, next) => {
    try {
        const { username, email, password } = req.body;
        if (typeof username !== 'string' || !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim()) || typeof email !== 'string' ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' ||
            email.trim().length > 254 || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                success: false,
                message: 'Provide a username (3–30 letters, numbers, or underscores), valid email, and password of at least 8 characters (maximum 72 UTF-8 bytes).',
            });
        }
        const existingUser = await prisma_1.prisma.user.findFirst({
            where: { OR: [{ email: email.toLowerCase().trim() }, { username: username.toLowerCase().trim() }] },
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: existingUser.username === username.toLowerCase().trim() ? 'Username already taken.' : 'Email already registered.',
            });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: {
                name: username.trim(),
                username: username.toLowerCase().trim(),
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                role: 'STUDENT',
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                targetExam: true,
                role: true,
                createdAt: true,
            },
        });
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return res.status(201).json({
            success: true,
            message: 'अकाउंट सफलतापूर्वक बनाया गया (Account registered successfully)',
            data: {
                user,
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { password } = req.body;
        const identifier = req.body.identifier ?? req.body.email;
        if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
            return res.status(400).json({
                success: false,
                message: 'Enter your username or email and password.',
            });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: identifier.includes('@') ? { email: identifier.toLowerCase().trim() } : { username: identifier.toLowerCase().trim() },
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
            });
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
            });
        }
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        return res.status(200).json({
            success: true,
            message: 'सफलतापूर्वक लॉगिन किया गया',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    targetExam: user.targetExam,
                    role: user.role,
                },
                token,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const getMe = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthenticated' });
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                phone: true,
                targetExam: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMe = getMe;
