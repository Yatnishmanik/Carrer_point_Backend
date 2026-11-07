import { Router } from 'express';
import authRoutes from './auth.routes';
import examRoutes from './exam.routes';
import testRoutes from './test.routes';
import questionRoutes from './question.routes';
import attemptRoutes from './attempt.routes';
import practiceRoutes from './practice.routes';
import updateRoutes from './update.routes';
import adminRoutes from './admin.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/exams', examRoutes);
router.use('/tests', testRoutes);
router.use('/questions', questionRoutes);
router.use('/attempts', attemptRoutes);
router.use('/practice', practiceRoutes);
router.use('/updates', updateRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AR Career Point Backend API',
    database: 'PostgreSQL + Prisma',
    timestamp: new Date().toISOString(),
  });
});

export default router;
