import { Router } from 'express';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middlewares/auth';
import { createManagedUser, deleteManagedUser, getAdminOverview, updateManagedUser } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate);
router.get('/overview', requireAdmin, getAdminOverview);
router.delete('/users/:id', requireAdmin, deleteManagedUser);
router.use(requireSuperAdmin);
router.post('/users', createManagedUser);
router.put('/users/:id', updateManagedUser);
export default router;
