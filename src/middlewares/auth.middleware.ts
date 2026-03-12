import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. SDE Type Safety: We extend Express's standard Request to include our custom userId
export interface AuthRequest extends Request {
    userId?: string;
}

export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Access Denied. No token provided.' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = process.env.JWT_SECRET as string;
        // 2. Decrypt the token to get the user ID we packed inside it during Login
        const decoded = jwt.verify(token, secret) as { id: string };

        // 3. Attach the ID to the request object so the Controller can use it!
        req.userId = decoded.id;

        next(); // Pass control to the controller
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};