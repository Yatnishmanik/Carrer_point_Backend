import { Router } from 'express';
import { getUpdates, createUpdate } from '../controllers/update.controller';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

router.get('/', getUpdates);
router.post('/', authenticate, requireAdmin, createUpdate);

export default router;
