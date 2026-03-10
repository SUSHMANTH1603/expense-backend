// 1. ALL IMPORTS AT THE TOP
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 2. MONGODB CONNECTION
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('🟢 Connected to MongoDB Atlas (Cloud)!'))
    .catch(err => console.error('🔴 MongoDB connection error:', err));

// 3. DATABASE SCHEMAS
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

const expenseSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now }
});
const Expense = mongoose.model('Expense', expenseSchema);

// 4. AUTHENTICATION ROUTES (Public)

// REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ email: req.body.email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(400).json({ error: 'Email already exists or invalid data' });
    }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || 'super_secret_key', { expiresIn: '1h' });

        setTimeout(() => {
            res.json({ token });
        }, 500);
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// 5. THE MIDDLEWARE BOUNCER
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access Denied: No token provided' });

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key', (err, decodedUser) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token' });
        req.user = decodedUser;
        next();
    });
};

// 6. PROTECTED EXPENSE ROUTES (Requires Token)

// GET Expenses
app.get('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user.userId }).sort({ date: -1 });
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

// POST Expense
app.post('/api/expenses', authenticateToken, async (req, res) => {
    try {
        const newExpense = new Expense({
            userId: req.user.userId,
            title: req.body.title,
            amount: req.body.amount,
            category: req.body.category
        });
        const savedExpense = await newExpense.save();
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

// UPDATE: Modify an existing expense
app.put('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        // findOneAndUpdate safely checks the ID AND ensures the logged-in user owns it
        const updatedExpense = await Expense.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            {
                title: req.body.title,
                amount: req.body.amount,
                category: req.body.category
            },
            { new: true } // This tells MongoDB to return the NEW updated version, not the old one
        );

        if (!updatedExpense) return res.status(404).json({ error: 'Expense not found' });

        // Send the updated data back to Angular
        res.json({
            id: updatedExpense._id.toString(),
            title: updatedExpense.title,
            amount: updatedExpense.amount,
            category: updatedExpense.category,
            date: updatedExpense.date
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update expense' });
    }
});

// DELETE Expense
app.delete('/api/expenses/:id', authenticateToken, async (req, res) => {
    try {
        await Expense.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
        res.json({ message: 'Expense deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});

// AGGREGATION: Get Chart Stats
app.get('/api/expenses/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await Expense.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(req.user.userId) } },
            { $group: { _id: '$category', totalSpent: { $sum: '$amount' } } },
            { $sort: { totalSpent: -1 } }
        ]);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to aggregate data' });
    }
});

// 7. BACKGROUND JOB & SERVER START
setInterval(() => {
    console.log(`[Background Job] Server health check at ${new Date().toLocaleTimeString()}`);
}, 3600000);

app.listen(PORT, () => {
    console.log(`🚀 Expense API running on http://localhost:${PORT}`);
});

// THE SDE HEARTBEAT: Ping the server every 14 minutes to prevent Render from sleeping
const RENDER_URL = 'https://expense-backend-6b8n.onrender.com';

setInterval(() => {
    https.get(RENDER_URL, (res) => {
        console.log(`Heartbeat ping sent. Status: ${res.statusCode}`);
    }).on('error', (err) => {
        console.error('Heartbeat ping failed:', err.message);
    });
}, 840000); // 840,000 milliseconds = exactly 14 minutes