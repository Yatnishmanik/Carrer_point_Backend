"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUpdate = exports.getUpdates = void 0;
const prisma_1 = require("../lib/prisma");
const getUpdates = async (_req, res, next) => {
    try {
        const updates = await prisma_1.prisma.noticeUpdate.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
        });
        return res.status(200).json({
            success: true,
            data: updates,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUpdates = getUpdates;
const createUpdate = async (req, res, next) => {
    try {
        const { title, date, badge, link } = req.body;
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required',
            });
        }
        const update = await prisma_1.prisma.noticeUpdate.create({
            data: {
                title,
                date: date || 'Just now',
                badge: badge || null,
                link: link || null,
            },
        });
        return res.status(201).json({
            success: true,
            message: 'Notice update added successfully',
            data: update,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createUpdate = createUpdate;
