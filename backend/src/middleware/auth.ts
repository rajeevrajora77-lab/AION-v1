import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../types';

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;
    if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    } else if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string };
    
    const currentUser = await userRepository.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token does no longer exist.', 401));
    }

    // Attach user to request
    (req as AuthRequest).user = currentUser;
    next();
  } catch (error) {
    next(new AppError('Invalid token or session expired', 401));
  }
};
