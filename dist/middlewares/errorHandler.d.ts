import { Request, Response, NextFunction } from 'express';
export declare const errorHandler: (err: Error & {
    code?: string;
    status?: number;
}, _req: Request, res: Response, _next: NextFunction) => Response<any, Record<string, any>>;
