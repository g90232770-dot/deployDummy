import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios"
import dotenv from 'dotenv'
import mongoose from "mongoose";
import ChatHistory from "./models/QA.js" // schema

const app = express();
dotenv.config(); // Loads .env into process.env
const PORT = process.env.PORT || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY_TWO;

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log("MongoDB connected");
}).catch((err) => {
  console.error("MongoDB connection error:", err);
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, "dist")));

// for req body
app.use(express.json());

// openrouter api
app.post("/api/chat", async (req, res) => {

  const question = req.body.mess[1].content;
  const model = req.body.mod
  const hist = req.body.hist

  try {

    // 1 Check for qusetion
    if (!question || !model) return res.status(200).json({ data: "Missing question" });

    if (hist){
      // 2 Check DB
      let history = await ChatHistory.findOne({ question: question, model: model });
      if (history) {
        return res.status(200).json({ data: history.answer, fromCache: true });
      }
      
      // 3 If not found → call OpenRouter
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          // model: req.body.model || 'meta-llama/llama-3.3-8b-instruct:free',
          model: model,
          messages: req.body.mess,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      const answer = response.data?.choices?.[0]?.message?.content || "";
      // 4 Save to DB
      history = new ChatHistory({
        question: question,
        answer: answer,
        model: model,
      });
      await history.save();
      res.status(200).json({ data: answer, fromCache: false });

    }else {

      // 4 If histroy is disabled
      let history = await ChatHistory.findOne({ question: question, model: model });

      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          // model: req.body.model || 'meta-llama/llama-3.3-8b-instruct:free',
          model: model,
          messages: req.body.mess,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const answer = response.data?.choices?.[0]?.message?.content || "";

      if (history) {
      }else{
        let alp = new ChatHistory({
          question: question,
          answer: answer,
          model: model,
        });
        await alp.save();
      }
      res.status(200).json({ data: answer, fromCache: false });
    }
    
  } catch (error) {
    console.error("Error in /api/chat:", error?.response?.data || error.message);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Catch-all: send index.html for React Router routes
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "dist","index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});