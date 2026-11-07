import { Router } from 'express';
import { register, login, getMe, checkAvailability } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.get('/availability', checkAvailability);
router.post('/login', login);
router.get('/me', authenticate, getMe);

export default router;
