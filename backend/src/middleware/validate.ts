import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const validateRequest = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: any) => `${issue.path.join('.')} is ${issue.message}`);
        res.status(400).json({ status: 'fail', error: 'Invalid data', details: errorMessages });
        return;
      }
      next(new AppError('Internal validation error', 500));
    }
  };
