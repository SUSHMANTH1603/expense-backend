require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
// 1. Use the PORT from the .env file, or default to 3000
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 2. Connect to MongoDB using the hidden environment variable!
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🟢 Connected to MongoDB Atlas (Cloud)!'))
    .catch(err => console.error('🔴 MongoDB connection error:', err));
// 3. Define the Database Schema (The Rules)
const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

// 4. Create the Model (The tool we use to talk to the database)
const Expense = mongoose.model('Expense', expenseSchema);

// --- THE REAL API ENDPOINTS ---

// READ: Fetch from MongoDB
app.get('/api/expenses', async (req, res) => {
    try {
        const expenses = await Expense.find(); // Get all documents

        // SDE Trick: MongoDB uses '_id', but our Angular frontend expects 'id'.
        // We map the data here so we don't have to rewrite our frontend code!
        const formattedExpenses = expenses.map(exp => ({
            id: exp._id.toString(),
            title: exp.title,
            amount: exp.amount,
            category: exp.category,
            date: exp.date
        }));

        res.json(formattedExpenses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch expenses' });
    }
});

// CREATE: Save to MongoDB
app.post('/api/expenses', async (req, res) => {
    try {
        const newExpense = new Expense({
            title: req.body.title,
            amount: req.body.amount,
            category: req.body.category
        });

        const savedExpense = await newExpense.save(); // Physically save it to the DB

        // Format the response for Angular
        res.status(201).json({
            id: savedExpense._id.toString(),
            title: savedExpense.title,
            amount: savedExpense.amount,
            category: savedExpense.category,
            date: savedExpense.date
        });
    } catch (error) {
        res.status(400).json({ error: 'Failed to save expense' });
    }
});

// DELETE: Remove from MongoDB
app.delete('/api/expenses/:id', async (req, res) => {
    try {
        const idToDelete = req.params.id;
        await Expense.findByIdAndDelete(idToDelete); // Tell MongoDB to delete it
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`🚀 Expense API running on http://localhost:${PORT}`);
});