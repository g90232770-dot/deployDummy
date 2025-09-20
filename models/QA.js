// models/ChatHistory.js
import mongoose from "mongoose";

const chatHistorySchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  model: { type: String, required: true }, // model used for this answer
  createdAt: { type: Date, default: Date.now }
});

// Index for faster search by question+model
chatHistorySchema.index({ question: 1, model: 1 }, { unique: true });

export default mongoose.model("ChatHistory", chatHistorySchema, "chathistory"); 
// last "chathistory" ensures Atlas collection is used