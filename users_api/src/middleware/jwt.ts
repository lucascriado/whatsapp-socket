import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secretKey = 'your_secret_key';

export const verifyJWT = (req: Request, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Token não fornecido' });
    return;
  }

  jwt.verify(token, secretKey, (error, decoded) => {
    if (error) {
      res.status(401).json({ message: 'Falha na autenticação do token' });
      return;
    }

    if (decoded && typeof decoded === 'object') {
      req.body.username = (decoded as { username: string }).username;
    }
    next();
  });
};

export const signJWT = (username: string): string => {
  return jwt.sign({ username }, secretKey, { expiresIn: '1h' });
};