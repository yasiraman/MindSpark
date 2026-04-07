import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  const logToFile = (msg: string) => {
    try {
      fs.appendFileSync("server.log", `[${new Date().toISOString()}] ${msg}\n`);
    } catch (e) {
      console.error("Failed to write to server.log:", e);
    }
  };

  logToFile(`[SERVER] Initializing in ${process.env.NODE_ENV} mode...`);
  console.log(`[SERVER] Initializing in ${process.env.NODE_ENV} mode...`);

// Trust proxy for Hostinger/Nginx
app.set("trust proxy", true);

app.use(express.json());
app.use((req, res, next) => {
  const logMsg = `[REQUEST] ${req.method} ${req.url} - Origin: ${req.headers.origin} - Host: ${req.headers.host}`;
  logToFile(logMsg);
  console.log(logMsg);
  next();
});
app.use(cors({
  origin: (origin, callback) => {
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Game State
interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: number;
  isCorrect?: boolean;
  lastSeen: number;
}

interface Game {
  pin: string;
  hostId: string;
  status: "lobby" | "playing" | "results" | "ended";
  players: Record<string, Player>;
  currentQuestionIndex: number;
  questions: any[];
  lastUpdated: number;
}

const games = new Map<string, Game>();

// Helper to generate a random 6-digit PIN
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Cleanup inactive games/players
setInterval(() => {
  const now = Date.now();
  for (const [pin, game] of games.entries()) {
    // If game hasn't been updated in 30 mins, delete it
    if (now - game.lastUpdated > 30 * 60 * 1000) {
      games.delete(pin);
      continue;
    }
    // Remove players inactive for 1 minute
    for (const playerId in game.players) {
      if (now - game.players[playerId].lastSeen > 60 * 1000) {
        delete game.players[playerId];
      }
    }
  }
}, 60000);

// --- API ROUTER ---
const apiRouter = express.Router();

// Create Game
apiRouter.post("/game/create", (req, res) => {
  const { questions, hostId } = req.body;
  if (!questions || !hostId) return res.status(400).json({ error: "Missing questions or hostId" });

  const pin = generatePin();
  const game: Game = {
    pin,
    hostId,
    status: "lobby",
    players: {},
    currentQuestionIndex: 0,
    questions,
    lastUpdated: Date.now()
  };
  games.set(pin, game);
  res.json({ pin, questions });
});

// Join Game
apiRouter.post("/game/join", (req, res) => {
  const { pin, name, playerId } = req.body;
  const game = games.get(pin);

  if (!game) return res.status(404).json({ error: "Game not found" });
  if (game.status !== "lobby") return res.status(400).json({ error: "Game already started" });

  game.players[playerId] = {
    id: playerId,
    name,
    score: 0,
    lastSeen: Date.now()
  };
  game.lastUpdated = Date.now();
  res.json({ pin, name, playerId });
});

// Start Game
apiRouter.post("/game/start", (req, res) => {
  const { pin, hostId } = req.body;
  const game = games.get(pin);

  if (!game) return res.status(404).json({ error: "Game not found" });
  if (game.hostId !== hostId) return res.status(403).json({ error: "Unauthorized" });

  game.status = "playing";
  game.lastUpdated = Date.now();
  res.json({ success: true });
});

// Submit Answer
apiRouter.post("/game/answer", (req, res) => {
  const { pin, playerId, answerIndex } = req.body;
  const game = games.get(pin);

  if (!game || game.status !== "playing") return res.status(400).json({ error: "Invalid game state" });
  
  const player = game.players[playerId];
  if (!player || player.lastAnswer !== undefined) return res.status(400).json({ error: "Already answered or not in game" });

  const currentQuestion = game.questions[game.currentQuestionIndex];
  const isCorrect = answerIndex === currentQuestion.correctAnswer;
  
  player.lastAnswer = answerIndex;
  player.isCorrect = isCorrect;
  player.lastSeen = Date.now();
  if (isCorrect) {
    player.score += 100;
  }

  game.lastUpdated = Date.now();

  // Check if all players answered
  const totalPlayers = Object.keys(game.players).length;
  const answeredCount = Object.values(game.players).filter(p => p.lastAnswer !== undefined).length;

  if (answeredCount === totalPlayers) {
    game.status = "results";
  }

  res.json({ success: true });
});

// Next Question
apiRouter.post("/game/next", (req, res) => {
  const { pin, hostId } = req.body;
  const game = games.get(pin);

  if (!game) return res.status(404).json({ error: "Game not found" });
  if (game.hostId !== hostId) return res.status(403).json({ error: "Unauthorized" });

  game.currentQuestionIndex++;
  if (game.currentQuestionIndex < game.questions.length) {
    game.status = "playing";
    // Reset player answer states
    Object.values(game.players).forEach(p => {
      p.lastAnswer = undefined;
      p.isCorrect = undefined;
    });
  } else {
    game.status = "ended";
  }
  game.lastUpdated = Date.now();
  res.json({ success: true });
});

// Get Game State (Polling)
apiRouter.get("/game/:pin", (req, res) => {
  const { pin } = req.params;
  const { playerId, hostId } = req.query;
  const game = games.get(pin);

  if (!game) return res.status(404).json({ error: "Game not found" });

  // Update lastSeen for player
  if (playerId && typeof playerId === "string" && game.players[playerId]) {
    game.players[playerId].lastSeen = Date.now();
  } else if (hostId && typeof hostId === "string" && game.hostId === hostId) {
    game.lastUpdated = Date.now();
  }

  // Return state based on status
  const state: any = {
    status: game.status,
    currentQuestionIndex: game.currentQuestionIndex,
    totalQuestions: game.questions.length,
    players: Object.values(game.players).map(p => ({ id: p.id, name: p.name, score: p.score }))
  };

  if (game.status === "playing") {
    state.question = game.questions[game.currentQuestionIndex];
    // For players, check if they already answered
    if (playerId && typeof playerId === "string") {
      state.hasAnswered = game.players[playerId]?.lastAnswer !== undefined;
    }
  } else if (game.status === "results") {
    state.correctAnswer = game.questions[game.currentQuestionIndex].correctAnswer;
    state.playerResults = Object.values(game.players);
  } else if (game.status === "ended") {
    state.leaderboard = Object.values(game.players).sort((a, b) => b.score - a.score);
  }

  res.json(state);
});

// AI Question Generation Route
apiRouter.post("/generate-questions", async (req, res) => {
  const { topic, count = 5 } = req.body;
  
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY not configured on server" });
  }

  try {
    const prompt = `Generate a quiz with ${count} multiple-choice questions about "${topic}". 
    Return ONLY a JSON array of objects with this structure:
    [
      {
        "text": "Question text",
        "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
        "correctAnswer": 0, // index of the correct option
        "timeLimit": 20
      }
    ]
    Ensure the questions are fun and engaging. Do not include any markdown formatting or extra text.`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json"
      }
    });

    const responseText = result.text;
    if (!responseText) throw new Error("No response from AI");
    
    const questions = JSON.parse(responseText);
    res.json(questions);
  } catch (error) {
    console.error("[AI ERROR]", error);
    logToFile(`[AI ERROR] ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: "Failed to generate questions with AI" });
  }
});

apiRouter.get("/test-origin", (req, res) => {
  res.json({
    origin: req.headers.origin,
    host: req.headers.host,
    xForwardedFor: req.headers["x-forwarded-for"],
    xForwardedProto: req.headers["x-forwarded-proto"],
    remoteAddress: req.socket.remoteAddress
  });
});

apiRouter.get("/test-text", (req, res) => {
  res.send("API_IS_WORKING_FINE_V2");
});

// Mount API Router
app.use("/api/v1", apiRouter);

// Specific 404 for API routes to prevent HTML fallback
app.use("/api", (req, res) => {
  res.status(404).json({ 
    error: "API endpoint not found", 
    method: req.method, 
    path: req.originalUrl 
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/ping", (req, res) => {
  res.send("pong");
});

// Serve Static Files
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  // Vite middleware for development
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false // Disable HMR to avoid port conflicts
    },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    const msg = `[SERVER] Running on http://0.0.0.0:${PORT}`;
    console.log(msg);
    logToFile(msg);
    logToFile(`[ENV] NODE_ENV: ${process.env.NODE_ENV}`);
    logToFile(`[ENV] PORT: ${process.env.PORT}`);
  });
}

startServer();
