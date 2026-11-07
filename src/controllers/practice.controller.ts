import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getPracticeSets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, subject } = req.query;

    const where: Record<string, unknown> = {};
    if (category && typeof category === 'string') where.category = category;
    if (subject && typeof subject === 'string') where.subject = subject;

    const sets = await prisma.practiceSet.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: sets,
    });
  } catch (error) {
    next(error);
  }
};

export const createPracticeSet = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      subject,
      category,
      questionsCount,
      durationMinutes,
      pdfUrl,
      isFree,
      difficulty,
      testId,
    } = req.body;

    if (!title || !subject || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and category are required',
      });
    }

    const practiceSet = await prisma.practiceSet.create({
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
  } catch (error) {
    next(error);
  }
};
