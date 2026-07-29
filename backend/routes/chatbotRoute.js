import { Router } from 'express';
import { sendMessage } from '../controllers/chatbotController.js';

const router = Router();

router.post('/message', sendMessage);

export default router;
