import { Router } from 'express';
import {
  getTests,
  getTestById,
  getTestLeaderboard,
  createTest,
  deleteTest,
} from '../controllers/test.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getTests);
router.get('/:id/leaderboard', authenticate, getTestLeaderboard);
router.get('/:id', getTestById);
router.post('/', authenticate, requireAdmin, createTest);
router.delete('/:id', authenticate, requireAdmin, deleteTest);

export default router;
