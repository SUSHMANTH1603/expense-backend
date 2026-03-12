// src/server.ts
import express, { Application } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import expenseRoutes from './routes/expense.routes';


dotenv.config();

const app: Application = express();
app.use(cors());
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:4200', 'https://smart-expense-frontend-one.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use('/api/auth', authRoutes);


// A simple test route to prove the server is awake
app.get('/api/health', (req, res) => {
  res.json({ message: 'TypeScript Backend is ALIVE!' });
});

const PORT = Number(process.env.PORT) || 3000;

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/expense_tracker'; // Fallback just in case .env is missing

// Connect to Database and start server
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });