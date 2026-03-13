import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense, getExpenseStats } from '../controllers/expense.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();

// THE SDE LOCK: By putting the middleware here, EVERY route below it is protected!
router.use(verifyToken);

router.get('/stats', getExpenseStats);
router.get('/', getExpenses);           // GET /api/expenses
router.post('/', createExpense);        // POST /api/expenses
router.put('/:id', updateExpense);      // PUT /api/expenses/123
router.delete('/:id', deleteExpense);   // DELETE /api/expenses/123

export default router;