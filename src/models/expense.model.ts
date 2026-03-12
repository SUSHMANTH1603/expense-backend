import mongoose, { Schema, Document } from 'mongoose';

// 1. The TypeScript Interface (Strict typing for your code)
export interface IExpense extends Document {
    title: string;
    amount: number;
    category: string;
    user: mongoose.Types.ObjectId; // Links to the User model
    date: Date;
}

// 2. The Mongoose Schema (Strict typing for the database)
const ExpenseSchema: Schema = new Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    category: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now }
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

// Export the compiled model
export default mongoose.model<IExpense>('Expense', ExpenseSchema);