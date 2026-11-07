import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const userFields = { id: true, name: true, email: true, phone: true, targetExam: true, role: true, createdAt: true } as const;
const manageableRoles = [Role.ADMIN, Role.STUDENT];

export const getAdminOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const [users, tests, questions] = await Promise.all([
      prisma.user.findMany({
        select: req.user?.role === 'SUPERADMIN' ? userFields : { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.test.count(),
      prisma.question.count(),
    ]);
    res.json({ success: true, data: { users, totalUsers: await prisma.user.count(), totalTests: tests, totalQuestions: questions } });
  } catch (error) { next(error); }
};

export const createManagedUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, phone, targetExam } = req.body;
    if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== 'string' ||
        password.length < 8 || Buffer.byteLength(password, 'utf8') > 72 || !manageableRoles.includes(role) ||
        (phone !== undefined && typeof phone !== 'string') || (targetExam !== undefined && typeof targetExam !== 'string')) {
      return res.status(400).json({ success: false, message: 'Provide a name, valid email, password (8–72 bytes), and role ADMIN or STUDENT.' });
    }
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.toLowerCase().trim(), password: await bcrypt.hash(password, 10), role, phone: phone?.trim() || null, targetExam: targetExam?.trim() || null },
      select: userFields,
    });
    res.status(201).json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const updateManagedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { name, email, password, role, phone, targetExam } = req.body;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || (existing.role !== Role.ADMIN && existing.role !== Role.STUDENT)) return res.status(404).json({ success: false, message: 'User not found.' });
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
      ...(password !== undefined ? { password: await bcrypt.hash(password, 10) } : {}),
      ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
      ...(targetExam !== undefined ? { targetExam: targetExam?.trim() || null } : {}),
    };
    const user = await prisma.user.update({ where: { id }, data, select: userFields });
    res.json({ success: true, data: user });
  } catch (error) { next(error); }
};

export const deleteManagedUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    if (id === req.user?.userId) return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found.' });
    const allowedRoles = req.user?.role === 'SUPERADMIN' ? manageableRoles : [Role.STUDENT];
    if (!allowedRoles.some(role => role === existing.role)) return res.status(403).json({ success: false, message: 'You cannot remove this account.' });
    const deleted = await prisma.user.deleteMany({ where: { id, role: { in: allowedRoles } } });
    if (!deleted.count) return res.status(409).json({ success: false, message: 'The account role changed. Refresh the user list.' });
    res.json({ success: true, data: { id } });
  } catch (error) { next(error); }
};
