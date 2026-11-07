import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getUpdates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const updates = await prisma.noticeUpdate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.status(200).json({
      success: true,
      data: updates,
    });
  } catch (error) {
    next(error);
  }
};

export const createUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, date, badge, link } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Title is required',
      });
    }

    const update = await prisma.noticeUpdate.create({
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
  } catch (error) {
    next(error);
  }
};
