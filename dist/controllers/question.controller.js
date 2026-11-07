"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllQuestions = exports.deleteQuestion = exports.addQuestion = exports.bulkImportQuestions = void 0;
const prisma_1 = require("../lib/prisma");
const node_crypto_1 = require("node:crypto");
const questionImport_1 = require("../utils/questionImport");
const bulkImportQuestions = async (req, res, next) => {
    try {
        const { testId, questions } = req.body || {};
        if (typeof testId !== 'string' || !testId.trim() || !Array.isArray(questions) || !questions.length || questions.length > questionImport_1.MAX_IMPORT_QUESTIONS) {
            return res.status(400).json({ success: false, message: `Select a test and provide 1–${questionImport_1.MAX_IMPORT_QUESTIONS} questions.` });
        }
        const cleaned = [];
        const errors = [];
        const fingerprints = new Set();
        questions.forEach((value, index) => {
            const validated = (0, questionImport_1.validateImportedQuestion)(value);
            if (!validated.question) {
                errors.push({ question: index + 1, message: validated.message });
                return;
            }
            const fingerprint = (0, questionImport_1.questionFingerprint)(validated.question);
            if (fingerprints.has(fingerprint)) {
                errors.push({ question: index + 1, message: 'Duplicate question in this upload.' });
                return;
            }
            fingerprints.add(fingerprint);
            cleaned.push(validated.question);
        });
        if (errors.length)
            return res.status(400).json({ success: false, message: `Question ${errors[0].question}: ${errors[0].message}`, errors });
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Updating the parent first serializes concurrent imports into the same test.
            const test = await tx.test.update({ where: { id: testId.trim() }, data: { totalMarks: { increment: 0 } }, select: { id: true } });
            const existing = await tx.question.findMany({ where: { testId: test.id }, include: { options: { orderBy: { order: 'asc' } } } });
            const existingFingerprints = new Set(existing.map(q => (0, questionImport_1.questionFingerprint)({ questionText: q.questionText, subject: q.subject || undefined, marks: q.marks, negativeMarks: q.negativeMarks, options: q.options })));
            const duplicate = cleaned.findIndex(q => existingFingerprints.has((0, questionImport_1.questionFingerprint)(q)));
            if (duplicate !== -1)
                throw Object.assign(new Error(`Question ${duplicate + 1} already exists in the selected test. Nothing was imported.`), { status: 409 });
            const startOrder = existing.reduce((max, q) => Math.max(max, q.order), -1) + 1;
            const rows = cleaned.map((q, index) => ({ id: (0, node_crypto_1.randomUUID)(), testId: test.id, questionText: q.questionText, subject: q.subject || null, explanation: q.explanation || null, marks: q.marks, negativeMarks: q.negativeMarks, order: startOrder + index }));
            await tx.question.createMany({ data: rows });
            await tx.option.createMany({ data: rows.flatMap((q, index) => cleaned[index].options.map((option, order) => ({ id: (0, node_crypto_1.randomUUID)(), questionId: q.id, text: option.text, isCorrect: option.isCorrect, order }))) });
            const marksAdded = Number(cleaned.reduce((sum, q) => sum + q.marks, 0).toFixed(10));
            const updated = await tx.test.update({ where: { id: test.id }, data: { totalMarks: { increment: marksAdded } }, select: { totalMarks: true } });
            return { testId: test.id, importedCount: rows.length, marksAdded, totalMarks: updated.totalMarks };
        }, { maxWait: 10000, timeout: 20000 });
        return res.status(201).json({ success: true, data: result });
    }
    catch (error) {
        next(error);
    }
};
exports.bulkImportQuestions = bulkImportQuestions;
const addQuestion = async (req, res, next) => {
    try {
        const { testId, questionText, subject, explanation, marks = 1.0, negativeMarks = 0.25, options, // array of { text: string, isCorrect: boolean }
         } = req.body;
        if (typeof questionText !== 'string' || !questionText.trim() ||
            (testId !== undefined && typeof testId !== 'string') ||
            (subject !== undefined && typeof subject !== 'string') ||
            (explanation !== undefined && typeof explanation !== 'string') ||
            typeof marks !== 'number' || !Number.isFinite(marks) || marks <= 0 ||
            typeof negativeMarks !== 'number' || !Number.isFinite(negativeMarks) || negativeMarks < 0 ||
            !Array.isArray(options) || options.length < 2 ||
            options.some(opt => !opt || typeof opt.text !== 'string' || !opt.text.trim() || typeof opt.isCorrect !== 'boolean') ||
            options.filter(opt => opt.isCorrect).length !== 1) {
            return res.status(400).json({
                success: false,
                message: 'Provide a question, positive marks, non-negative penalty, and at least two options with exactly one correct answer.',
            });
        }
        const createdQuestion = await prisma_1.prisma.$transaction(async (tx) => {
            const created = await tx.question.create({
                data: {
                    testId: testId || null,
                    questionText: questionText.trim(),
                    subject: subject ? subject.trim() : null,
                    explanation: explanation ? explanation.trim() : null,
                    marks: Number(marks),
                    negativeMarks: Number(negativeMarks),
                    options: {
                        create: options.map((opt, index) => ({
                            text: opt.text.trim(),
                            isCorrect: Boolean(opt.isCorrect),
                            order: index,
                        })),
                    },
                },
                include: {
                    options: true,
                },
            });
            // Update parent test's totalMarks if associated with a test
            if (testId) {
                await tx.test.update({
                    where: { id: testId },
                    data: {
                        totalMarks: {
                            increment: Number(marks),
                        },
                    },
                });
            }
            return created;
        });
        return res.status(201).json({
            success: true,
            message: 'प्रश्न सफलतापूर्वक जोड़ा गया (Question added successfully)',
            data: createdQuestion,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.addQuestion = addQuestion;
const deleteQuestion = async (req, res, next) => {
    try {
        const rawId = req.params.id;
        const id = String(Array.isArray(rawId) ? rawId[0] : rawId);
        await prisma_1.prisma.$transaction(async (tx) => {
            const existing = await tx.question.findUnique({ where: { id }, include: { _count: { select: { userAnswers: true } } } });
            if (!existing)
                throw Object.assign(new Error('Question not found'), { status: 404 });
            if (existing._count.userAnswers)
                throw Object.assign(new Error('Questions used in submitted tests cannot be deleted.'), { status: 409 });
            await tx.question.delete({ where: { id } });
            if (existing.testId)
                await tx.test.update({ where: { id: existing.testId }, data: { totalMarks: { decrement: existing.marks } } });
        });
        return res.status(200).json({
            success: true,
            message: 'प्रश्न हटाया गया (Question removed successfully)',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteQuestion = deleteQuestion;
const getAllQuestions = async (req, res, next) => {
    try {
        const { testId, subject } = req.query;
        const where = {};
        if (testId && typeof testId === 'string')
            where.testId = testId;
        if (subject && typeof subject === 'string')
            where.subject = subject;
        const questions = await prisma_1.prisma.question.findMany({
            where,
            include: {
                options: {
                    orderBy: { order: 'asc' },
                },
                test: {
                    select: { title: true, categoryName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json({
            success: true,
            data: questions,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllQuestions = getAllQuestions;
