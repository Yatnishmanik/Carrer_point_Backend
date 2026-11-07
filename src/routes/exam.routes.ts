import { Router } from 'express';
import { getExams, createExam, deleteExam } from '../controllers/exam.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getExams);
router.post('/', authenticate, requireAdmin, createExam);
router.delete('/:id', authenticate, requireAdmin, deleteExam);

export default router;
