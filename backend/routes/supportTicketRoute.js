import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { submitTicket, listMyTickets, listAllTickets, resolveTicket, closeTicket } from '../controllers/supportTicketController.js';

const router = express.Router();

router.post('/submit', authenticate, requireRole('vendor'), submitTicket);
router.get('/mine', authenticate, requireRole('vendor'), listMyTickets);
router.get('/all', authenticate, requireRole('admin'), listAllTickets);
router.put('/:id/resolve', authenticate, requireRole('admin'), resolveTicket);
router.put('/:id/close', authenticate, requireRole('admin'), closeTicket);

export default router;
