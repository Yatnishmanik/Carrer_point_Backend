import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const getExams = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;

    const whereClause: { category?: string } = {};
    if (category && typeof category === 'string' && category !== 'all') {
      whereClause.category = category;
    }

    const exams = await prisma.examCategory.findMany({
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
  } catch (error) {
    next(error);
  }
};

export const createExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, code, icon, colorClass, accentColor, gradient, items, category } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || !code.trim() ||
        (category !== undefined && !['bihar-board', 'competitive', 'all'].includes(category)) ||
        (items !== undefined && (!Array.isArray(items) || items.some((item: unknown) => typeof item !== 'string')))) {
      return res.status(400).json({
        success: false,
        message: 'Provide a name, code, valid category group, and a list of text items.',
      });
    }

    const exam = await prisma.examCategory.create({
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
  } catch (error) {
    next(error);
  }
};

export const deleteExam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rawId = req.params.id;
    const id = String(Array.isArray(rawId) ? rawId[0] : rawId);
    const existing = await prisma.examCategory.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Category not found.' });
    await prisma.examCategory.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Category deleted successfully.' });
  } catch (error) { next(error); }
};
