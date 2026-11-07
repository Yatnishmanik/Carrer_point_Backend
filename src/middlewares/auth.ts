import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'अनधिकृत: कृपया वैध टोकन प्रदान करें (Authorization token required)',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(401).json({ success: false, message: 'Account no longer exists' });
    req.user = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof Error && !['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
      return next(error);
    }
    return res.status(401).json({
      success: false,
      message: 'अमान्य या समाप्त टोकन (Invalid or expired token)',
    });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !['ADMIN', 'SUPERADMIN'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'निषेध: यह कार्रवाई केवल व्यवस्थापक (Admin) के लिए अनुमत है',
    });
  }
  next();
};

export const requireSuperAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({ success: false, message: 'This action is restricted to superadmins.' });
  }
  next();
};
