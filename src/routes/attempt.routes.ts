import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  submitAttempt,
  getUserAttempts,
  getAttemptById,
  getAttemptPerformance,
} from '../controllers/attempt.controller';

const router = Router();

router.use(authenticate);
router.post('/', submitAttempt);
router.get('/user/:userId', getUserAttempts);
router.get('/:id/performance', getAttemptPerformance);
router.get('/:id', getAttemptById);

export default router;
