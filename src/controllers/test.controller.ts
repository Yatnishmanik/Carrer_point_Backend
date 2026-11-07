import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export const getTests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query;

    const where: Record<string, unknown> = {
      isPublished: true,
    };

    if (category && typeof category === 'string' && category !== 'all') {
      where.OR = [
        { categoryName: { contains: category, mode: 'insensitive' } },
        { category: { category: { equals: category } } },
      ];
    }

    if (search && typeof search === 'string') {
      where.AND = [{ OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { categoryName: { contains: search, mode: 'insensitive' } },
      ] }];
    }

    const tests = await prisma.test.findMany({
      where,
      include: {
        _count: {
          select: { questions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = tests.map((t) => ({
      ...t,
      questionCount: t._count.questions,
    }));

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTestById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId);

    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        questions: {
          omit: { explanation: true },
          orderBy: { order: 'asc' },
          include: {
            options: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                text: true,
                order: true,
                // Exclude isCorrect during test taking to protect integrity
              },
            },
          },
        },
      },
    });

    if (!test || !test.isPublished) {
      return res.status(404).json({
        success: false,
        message: 'टेस्ट नहीं मिला (Test not found)',
      });
    }

    return res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    next(error);
  }
};

export const getTestLeaderboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const testId = String(Array.isArray(rawId) ? rawId[0] : rawId);
    const test = await prisma.test.findUnique({ where: { id: testId }, select: { id: true } });
    if (!test) return res.status(404).json({ success: false, message: 'Test not found' });

    const attempts = await prisma.testAttempt.findMany({
      where: { testId, userId: { not: null } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: [
        { score: 'desc' },
        { timeSpentSeconds: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Keep each student's best result so repeat attempts do not occupy multiple places.
    const bestByStudent = new Map<string, typeof attempts[number]>();
    for (const attempt of attempts) {
      if (attempt.user && !bestByStudent.has(attempt.user.id)) bestByStudent.set(attempt.user.id, attempt);
    }

    const leaderboard = Array.from(bestByStudent.values()).slice(0, 20).map((attempt, index) => ({
      rank: index + 1,
      name: attempt.user!.name,
      score: attempt.score,
      maxScore: attempt.maxScore,
      timeSpentSeconds: attempt.timeSpentSeconds,
      createdAt: attempt.createdAt,
    }));

    return res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

export const createTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      title,
      subtitle,
      categoryId,
      durationMinutes = 10,
      passingMarks = 0,
      tags = [],
      instructions,
    } = req.body;

    if (typeof title !== 'string' || !title.trim() || typeof categoryId !== 'string' || !categoryId.trim() ||
        !Number.isInteger(durationMinutes) || durationMinutes < 1 ||
        typeof passingMarks !== 'number' || !Number.isFinite(passingMarks) || passingMarks < 0 ||
        !Array.isArray(tags) || tags.some((tag: unknown) => typeof tag !== 'string' || !tag.trim()) ||
        (instructions !== undefined && (!Array.isArray(instructions) || instructions.some((item: unknown) => typeof item !== 'string')))) {
      return res.status(400).json({
        success: false,
        message: 'Provide a title, category, positive integer duration, non-negative passing marks, and valid tags/instructions.',
      });
    }

    const category = await prisma.examCategory.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Select an existing test category.' });
    }

    const newTest = await prisma.test.create({
      data: {
        title: title.trim(),
        subtitle: typeof subtitle === 'string' && subtitle.trim() ? subtitle.trim() : null,
        categoryId,
        categoryName: category.name,
        durationMinutes,
        passingMarks,
        tags: [...new Set(tags.map((tag: string) => tag.trim()))],
        instructions: instructions || [],
      },
    });

    return res.status(201).json({
      success: true,
      message: 'नया टेस्ट सफलतापूर्वक बनाया गया',
      data: newTest,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId);

    // Archive tests so historical attempts and their answer reviews remain available.
    await prisma.test.update({
      where: { id },
      data: { isPublished: false },
    });

    return res.status(200).json({
      success: true,
      message: 'टेस्ट आर्काइव किया गया (Test archived successfully)',
    });
  } catch (error) {
    next(error);
  }
};
