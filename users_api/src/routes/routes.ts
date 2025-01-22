import { Router } from 'express';
import { register, login } from '../controllers/authUsersController';
import { verifyJWT } from '../middleware/jwt';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/protected', verifyJWT, (req, res) => {
  res.status(200).json({ message: 'Acesso concedido à rota protegida' });
});

export default router;