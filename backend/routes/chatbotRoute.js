import { Router } from 'express';
import { sendMessage, getQuestions } from '../controllers/chatbotController.js';

const router = Router();

router.post('/message', sendMessage);
router.get('/questions', getQuestions);

export default router;