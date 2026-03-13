import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import Expense from '../models/expense.model'; // Make sure you created this from our earlier step!

// GET: Fetch only the logged-in user's expenses
export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const expenses = await Expense.find({ user: req.userId }).sort({ date: -1 });

        // SDE TRICK: Map the MongoDB '_id' to standard 'id' for the frontend
        const formattedExpenses = expenses.map(expense => {
            const expObj = expense.toObject();
            return {
                ...expObj,
                id: expObj._id // Angular will now be able to find the ID!
            };
        });

        res.status(200).json(formattedExpenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// POST: Create a new expense
export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, amount, category } = req.body;

        const newExpense = new Expense({
            title,
            amount,
            category,
            user: req.userId // We securely grab this from the middleware, NOT the frontend!
        });

        const savedExpense = await newExpense.save();
        res.status(201).json(savedExpense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

// PUT: Update an existing expense (For your Edit Route!)
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // findOneAndUpdate ensures they can only edit it if they own it
        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: id, user: req.userId },
            req.body,
            { new: true } // Returns the updated document instead of the old one
        );

        if (!updatedExpense) {
            res.status(404).json({ error: 'Expense not found or unauthorized' });
            return;
        }

        res.status(200).json(updatedExpense);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
};

// DELETE: Remove an expense
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const deletedExpense = await Expense.findOneAndDelete({ _id: id, user: req.userId });

        if (!deletedExpense) {
            res.status(404).json({ error: 'Expense not found or unauthorized' });
            return;
        }

        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};

// GET: Fetch stats for the dashboard
export const getExpenseStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const expenses = await Expense.find({ user: req.userId });

        // Calculate a simple total to satisfy the frontend
        const total = expenses.reduce((sum, item) => sum + item.amount, 0);

        res.status(200).json({ totalExpenses: total, count: expenses.length });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};