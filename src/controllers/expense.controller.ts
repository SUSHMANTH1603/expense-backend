import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middlewares/auth.middleware';
import Expense from '../models/expense.model';

// SDE HELPER: Always converts MongoDB '_id' to Angular 'id'
const formatExpense = (expenseDoc: any) => {
    const obj = expenseDoc.toObject ? expenseDoc.toObject() : expenseDoc;
    return {
        ...obj,
        id: obj._id.toString() // Forces it to be a clean string for Angular
    };
};

// 1. GET ALL
export const getExpenses = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const expenses = await Expense.find({ user: req.userId }).sort({ date: -1 });
        const formatted = expenses.map(formatExpense);
        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
};

// 2. CREATE (Fixed the glitch!)
export const createExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, amount, category } = req.body;
        const newExpense = new Expense({
            title, amount, category, user: req.userId
        });
        const savedExpense = await newExpense.save();

        // Return the formatted version so Angular gets the 'id' instantly
        res.status(201).json(formatExpense(savedExpense));
    } catch (error) {
        res.status(500).json({ error: 'Failed to create expense' });
    }
};

// 3. UPDATE
export const updateExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: id, user: req.userId },
            req.body,
            { new: true }
        );
        if (!updatedExpense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        res.status(200).json(formatExpense(updatedExpense));
    } catch (error) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
};

// 4. DELETE
export const deleteExpense = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deletedExpense = await Expense.findOneAndDelete({ _id: id, user: req.userId });
        if (!deletedExpense) {
            res.status(404).json({ error: 'Expense not found' });
            return;
        }
        res.status(200).json({ message: 'Deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
};

// 5. STATS (Fixed the Chart!)
export const getExpenseStats = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userObjId = new mongoose.Types.ObjectId(req.userId);

        const stats = await Expense.aggregate([
            { $match: { user: userObjId } },
            // Matches your Angular Signal perfectly: { _id: string, totalSpent: number }
            { $group: { _id: "$category", totalSpent: { $sum: "$amount" } } }
        ]);

        res.status(200).json(stats);
    } catch (error) {
        console.error("Stats Aggregation Error:", error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};