"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPracticeSet = exports.getPracticeSets = void 0;
const prisma_1 = require("../lib/prisma");
const getPracticeSets = async (req, res, next) => {
    try {
        const { category, subject } = req.query;
        const where = {};
        if (category && typeof category === 'string')
            where.category = category;
        if (subject && typeof subject === 'string')
            where.subject = subject;
        const sets = await prisma_1.prisma.practiceSet.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({
            success: true,
            data: sets,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPracticeSets = getPracticeSets;
const createPracticeSet = async (req, res, next) => {
    try {
        const { title, subject, category, questionsCount, durationMinutes, pdfUrl, isFree, difficulty, testId, } = req.body;
        if (!title || !subject || !category) {
            return res.status(400).json({
                success: false,
                message: 'Title, subject, and category are required',
            });
        }
        const practiceSet = await prisma_1.prisma.practiceSet.create({
            data: {
                title,
                testId: testId || null,
                subject,
                category,
                questionsCount: questionsCount ? Number(questionsCount) : 25,
                durationMinutes: durationMinutes ? Number(durationMinutes) : 30,
                pdfUrl: pdfUrl || null,
                isFree: isFree !== undefined ? Boolean(isFree) : true,
                difficulty: difficulty || 'Moderate',
            },
        });
        return res.status(201).json({
            success: true,
            message: 'अभ्यास सेट सफलतापूर्वक जोड़ा गया',
            data: practiceSet,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createPracticeSet = createPracticeSet;
