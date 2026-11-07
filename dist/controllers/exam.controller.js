"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExam = exports.createExam = exports.getExams = void 0;
const prisma_1 = require("../lib/prisma");
const getExams = async (req, res, next) => {
    try {
        const { category } = req.query;
        const whereClause = {};
        if (category && typeof category === 'string' && category !== 'all') {
            whereClause.category = category;
        }
        const exams = await prisma_1.prisma.examCategory.findMany({
            where: whereClause,
            include: {
                _count: {
                    select: { tests: { where: { isPublished: true } } },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
        const formatted = exams.map((ex) => ({
            ...ex,
            testCount: ex._count.tests,
        }));
        return res.status(200).json({
            success: true,
            data: formatted,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getExams = getExams;
const createExam = async (req, res, next) => {
    try {
        const { name, code, icon, colorClass, accentColor, gradient, items, category } = req.body;
        if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim() ||
            (category !== undefined && !['bihar-board', 'competitive', 'all'].includes(category)) ||
            (items !== undefined && (!Array.isArray(items) || items.some((item) => typeof item !== 'string')))) {
            return res.status(400).json({
                success: false,
                message: 'Provide a name, code, valid category group, and a list of text items.',
            });
        }
        const exam = await prisma_1.prisma.examCategory.create({
            data: {
                name: name.trim(),
                code: code.trim(),
                icon: icon || '📕',
                colorClass: colorClass || 'from-blue-600 to-indigo-500',
                accentColor: accentColor || '#2563eb',
                gradient: gradient || 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                items: items || [],
                category: category || 'all',
            },
        });
        return res.status(201).json({
            success: true,
            message: 'Exam category created successfully',
            data: exam,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createExam = createExam;
const deleteExam = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const id = String(Array.isArray(rawId) ? rawId[0] : rawId);
        const existing = await prisma_1.prisma.examCategory.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Category not found.' });
        await prisma_1.prisma.examCategory.delete({ where: { id } });
        return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteExam = deleteExam;
