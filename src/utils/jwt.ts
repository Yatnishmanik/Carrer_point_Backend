import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'STUDENT' | 'ADMIN' | 'SUPERADMIN';
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): TokenPayload => {
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  if (typeof payload === 'string' || typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' || !['STUDENT', 'ADMIN', 'SUPERADMIN'].includes(payload.role)) {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }
  return payload as TokenPayload;
};
