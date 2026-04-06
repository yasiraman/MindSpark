import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

// Trust proxy for Hostinger/Nginx
app.set("trust proxy", true);

app.use(express.json());
app.use(cors({
  origin: true, // Echo back origin for credentials
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["polling", "websocket"] // Polling first for better proxy compatibility
});

// Game State
interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: number;
  isCorrect?: boolean;
}

interface Game {
  pin: string;
  hostId: string;
  status: "lobby" | "playing" | "results" | "ended";
  players: Map<string, Player>;
  currentQuestionIndex: number;
  questions: any[];
}

const games = new Map<string, Game>();

// Helper to generate a random 6-digit PIN
function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on("connection", (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`);

  // --- HOST EVENTS ---
  socket.on("host:create", (questions: any[]) => {
    const pin = generatePin();
    const game: Game = {
      pin,
      hostId: socket.id,
      status: "lobby",
      players: new Map(),
      currentQuestionIndex: 0,
      questions
    };
    games.set(pin, game);
    socket.join(pin);
    socket.emit("host:game-created", { pin, questions });
    console.log(`[GAME] Created: ${pin} by ${socket.id}`);
  });

  socket.on("host:start-game", (pin: string) => {
    const game = games.get(pin);
    if (game && game.hostId === socket.id) {
      game.status = "playing";
      io.to(pin).emit("game:started", { 
        question: game.questions[game.currentQuestionIndex],
        index: game.currentQuestionIndex,
        total: game.questions.length
      });
    }
  });

  socket.on("host:next-question", (pin: string) => {
    const game = games.get(pin);
    if (game && game.hostId === socket.id) {
      game.currentQuestionIndex++;
      if (game.currentQuestionIndex < game.questions.length) {
        // Reset player answer states for new question
        game.players.forEach(p => {
          p.lastAnswer = undefined;
          p.isCorrect = undefined;
        });
        io.to(pin).emit("game:next-question", {
          question: game.questions[game.currentQuestionIndex],
          index: game.currentQuestionIndex
        });
      } else {
        game.status = "ended";
        const leaderboard = Array.from(game.players.values())
          .sort((a, b) => b.score - a.score);
        io.to(pin).emit("game:ended", leaderboard);
      }
    }
  });

  // --- PLAYER EVENTS ---
  socket.on("player:join", ({ pin, name }: { pin: string; name: string }) => {
    const game = games.get(pin);
    if (!game) {
      return socket.emit("player:error", "Game not found");
    }
    if (game.status !== "lobby") {
      return socket.emit("player:error", "Game already started");
    }

    const player: Player = { id: socket.id, name, score: 0 };
    game.players.set(socket.id, player);
    socket.join(pin);
    
    socket.emit("player:joined", { pin, name });
    io.to(game.hostId).emit("host:player-joined", Array.from(game.players.values()));
    console.log(`[PLAYER] Joined: ${name} to ${pin}`);
  });

  socket.on("player:answer", ({ pin, answerIndex }: { pin: string; answerIndex: number }) => {
    const game = games.get(pin);
    if (!game || game.status !== "playing") return;

    const player = game.players.get(socket.id);
    if (!player || player.lastAnswer !== undefined) return;

    const currentQuestion = game.questions[game.currentQuestionIndex];
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    player.lastAnswer = answerIndex;
    player.isCorrect = isCorrect;
    if (isCorrect) {
      player.score += 100; // Simple scoring
    }

    // Notify host that someone answered
    const answeredCount = Array.from(game.players.values()).filter(p => p.lastAnswer !== undefined).length;
    io.to(game.hostId).emit("host:answer-received", {
      answeredCount,
      totalPlayers: game.players.size
    });

    // If all players answered, show results automatically
    if (answeredCount === game.players.size) {
      io.to(pin).emit("game:show-results", {
        correctAnswer: currentQuestion.correctAnswer,
        players: Array.from(game.players.values())
      });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] Disconnected: ${socket.id}`);
    // Cleanup games if host leaves
    for (const [pin, game] of games.entries()) {
      if (game.hostId === socket.id) {
        io.to(pin).emit("player:error", "Host disconnected");
        games.delete(pin);
      } else if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        io.to(game.hostId).emit("host:player-joined", Array.from(game.players.values()));
      }
    }
  });
});

// API Routes
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
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running on port ${PORT}`);
  });
}

startServer();
