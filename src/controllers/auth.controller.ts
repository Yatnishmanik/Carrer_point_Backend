import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generateToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth';

export const checkAvailability = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email } = req.query;
    const checkingUsername = typeof username === 'string' && email === undefined;
    const checkingEmail = typeof email === 'string' && username === undefined;
    if ((!checkingUsername && !checkingEmail) ||
        (checkingUsername && !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) ||
        (checkingEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254))) {
      return res.status(400).json({ success: false, message: 'Provide a valid username or email.' });
    }
    const existing = await prisma.user.findUnique({
      where: checkingUsername ? { username: (username as string).trim().toLowerCase() } : { email: (email as string).trim().toLowerCase() },
      select: { id: true },
    });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, data: { available: !existing } });
  } catch (error) { next(error); }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
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

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email: email.toLowerCase().trim() }, { username: username.toLowerCase().trim() }] },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.username === username.toLowerCase().trim() ? 'Username already taken.' : 'Email already registered.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
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

    const token = generateToken({
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
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { password } = req.body;
    const identifier = req.body.identifier ?? req.body.email;

    if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Enter your username or email and password.',
      });
    }

    const user = await prisma.user.findUnique({
      where: identifier.includes('@') ? { email: identifier.toLowerCase().trim() } : { username: identifier.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'गलत ईमेल या पासवर्ड (Invalid email or password)',
      });
    }

    const token = generateToken({
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
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    next(error);
  }
};
