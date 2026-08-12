import express from 'express';
import { authenticate, authorize, requireRole } from '../middleware/auth.js';
import { submitTicket, listMyTickets, listAllTickets, resolveTicket, closeTicket } from '../controllers/supportTicketController.js';

const router = express.Router();

router.post('/submit', authenticate, requireRole('vendor'), submitTicket);
router.get('/mine', authenticate, requireRole('vendor'), listMyTickets);
router.get('/all', authenticate, authorize('tickets.manage.global', 'tickets.manage.region'), listAllTickets);
router.put('/:id/resolve', authenticate, authorize('tickets.manage.global', 'tickets.manage.region'), resolveTicket);
router.put('/:id/close', authenticate, authorize('tickets.manage.global', 'tickets.manage.region'), closeTicket);

export default router;
