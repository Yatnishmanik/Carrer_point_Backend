import { Router } from 'express';
import {
  getPracticeSets,
  createPracticeSet,
} from '../controllers/practice.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getPracticeSets);
router.post('/', authenticate, requireAdmin, createPracticeSet);

export default router;
