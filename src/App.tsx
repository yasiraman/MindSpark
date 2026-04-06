import React, { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { 
  Trophy, 
  Users, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  Layout, 
  User, 
  Settings, 
  LogOut, 
  ChevronRight, 
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

// --- TYPES ---
interface Question {
  text: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
  lastAnswer?: number;
  isCorrect?: boolean;
}

interface GameState {
  pin: string;
  status: "lobby" | "playing" | "results" | "ended";
  currentQuestion?: Question;
  questionIndex: number;
  totalQuestions: number;
  players: Player[];
  correctAnswer?: number;
}

// --- CONSTANTS ---
const DEFAULT_QUESTIONS: Question[] = [
  {
    text: "What is the capital of France?",
    options: ["Berlin", "Madrid", "Paris", "Rome"],
    correctAnswer: 2,
    timeLimit: 20
  },
  {
    text: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    timeLimit: 20
  },
  {
    text: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctAnswer: 1,
    timeLimit: 10
  }
];

const COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600"
];

const SHAPES = ["▲", "◆", "●", "■"];

// --- COMPONENTS ---

const Toast = ({ message, type, onClose }: { message: string; type: "error" | "info" | "success"; onClose: () => void }) => (
  <motion.div
    initial={{ y: 50, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 50, opacity: 0 }}
    className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
      type === "error" ? "bg-red-500/90 border-red-400 text-white" : 
      type === "success" ? "bg-green-500/90 border-green-400 text-white" :
      "bg-indigo-600/90 border-indigo-400 text-white"
    }`}
  >
    {type === "error" ? <AlertCircle size={20} /> : type === "success" ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 opacity-50 hover:opacity-100">
      <XCircle size={16} />
    </button>
  </motion.div>
);

const DebugInfo = ({ socket, transportMode, setTransportMode }: { 
  socket: Socket | null, 
  transportMode: string, 
  setTransportMode: (m: string) => void 
}) => {
  const [status, setStatus] = useState("DISCONNECTED");
  const [transport, setTransport] = useState("none");

  useEffect(() => {
    if (!socket) return;
    const update = () => {
      setStatus(socket.connected ? "CONNECTED" : "DISCONNECTED");
      setTransport(socket.io?.engine?.transport?.name || "none");
    };
    socket.on("connect", update);
    socket.on("disconnect", update);
    const interval = setInterval(update, 1000);
    return () => {
      socket.off("connect", update);
      socket.off("disconnect", update);
      clearInterval(interval);
    };
  }, [socket]);

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-xl text-xs font-mono z-50 border border-white/20 backdrop-blur-sm shadow-2xl">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${status === "CONNECTED" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
        <span className="font-bold uppercase tracking-wider">{status}</span>
      </div>
      <div className="space-y-1 opacity-80">
        <p>Transport: <span className="text-blue-400">{transport}</span></p>
        <p>Mode: <span className="text-purple-400">{transportMode}</span></p>
        <p>ID: <span className="text-gray-400">{socket?.id?.slice(0, 8) || "N/A"}</span></p>
      </div>
      <div className="flex gap-2 mt-3">
        <button 
          onClick={() => setTransportMode("auto")}
          className={`px-2 py-1 rounded border ${transportMode === "auto" ? "bg-white text-black border-white" : "border-white/30 hover:bg-white/10"}`}
        >
          Auto
        </button>
        <button 
          onClick={() => setTransportMode("polling")}
          className={`px-2 py-1 rounded border ${transportMode === "polling" ? "bg-white text-black border-white" : "border-white/30 hover:bg-white/10"}`}
        >
          Poll
        </button>
        <button 
          onClick={() => window.location.reload()}
          className="px-2 py-1 rounded border border-red-500/50 text-red-400 hover:bg-red-500/10 flex items-center gap-1"
        >
          <RefreshCw size={10} /> Reset
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<"landing" | "host" | "player">("landing");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [transportMode, setTransportMode] = useState<string>("auto");
  const [notification, setNotification] = useState<{ message: string; type: "error" | "info" | "success" } | null>(null);

  const showNotification = (message: string, type: "error" | "info" | "success" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Shared Socket Initialization
  useEffect(() => {
    const s = io({
      transports: transportMode === "auto" ? ["polling", "websocket"] : ["polling"],
      reconnectionAttempts: 10,
      timeout: 20000
    });

    s.on("connect_error", (err) => {
      console.error("Socket Error:", err.message);
      showNotification(`Connection failed: ${err.message}`, "error");
    });

    s.on("connect", () => {
      showNotification("Connected to server", "success");
    });

    s.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        showNotification("Disconnected by server", "error");
      } else {
        showNotification("Connection lost. Reconnecting...", "info");
      }
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, [transportMode]);

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500 rounded-full blur-3xl animate-pulse" />
        </div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center z-10"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-white p-4 rounded-3xl shadow-2xl rotate-3">
              <Layout size={64} className="text-indigo-600" />
            </div>
          </div>
          <h1 className="text-6xl font-black mb-4 tracking-tighter drop-shadow-lg">
            QUIZ<span className="text-indigo-400">SPARK</span>
          </h1>
          <p className="text-indigo-200 text-xl mb-12 max-w-md mx-auto font-medium">
            The ultimate real-time quiz platform for classrooms, parties, and events.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setView("player")}
              className="px-12 py-5 bg-white text-indigo-900 rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3"
            >
              <Users size={28} /> JOIN GAME
            </button>
            <button 
              onClick={() => setView("host")}
              className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all active:scale-95 border-b-4 border-indigo-800 flex items-center gap-3"
            >
              <Play size={28} /> HOST GAME
            </button>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {notification && (
            <Toast 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification(null)} 
            />
          )}
        </AnimatePresence>

        <DebugInfo socket={socket} transportMode={transportMode} setTransportMode={setTransportMode} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {view === "host" ? (
        <HostView socket={socket} onExit={() => setView("landing")} showNotification={showNotification} />
      ) : (
        <PlayerView socket={socket} onExit={() => setView("landing")} showNotification={showNotification} />
      )}
      
      <AnimatePresence>
        {notification && (
          <Toast 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>

      <DebugInfo socket={socket} transportMode={transportMode} setTransportMode={setTransportMode} />
    </div>
  );
}

// --- HOST VIEW ---
function HostView({ socket, onExit, showNotification }: { 
  socket: Socket | null, 
  onExit: () => void,
  showNotification: (m: string, t?: "error" | "info" | "success") => void 
}) {
  const [game, setGame] = useState<GameState | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.emit("host:create", DEFAULT_QUESTIONS);

    socket.on("host:game-created", ({ pin, questions }) => {
      setGame({
        pin,
        status: "lobby",
        questionIndex: 0,
        totalQuestions: questions.length,
        players: []
      });
      showNotification(`Game created! Pin: ${pin}`, "success");
    });

    socket.on("host:player-joined", (players: Player[]) => {
      setGame(prev => prev ? { ...prev, players } : null);
    });

    socket.on("game:started", ({ question, index, total }) => {
      setGame(prev => prev ? { 
        ...prev, 
        status: "playing", 
        currentQuestion: question, 
        questionIndex: index,
        totalQuestions: total,
        correctAnswer: undefined
      } : null);
      setAnsweredCount(0);
      showNotification("The game has started!", "info");
    });

    socket.on("host:answer-received", ({ answeredCount }) => {
      setAnsweredCount(answeredCount);
    });

    socket.on("game:show-results", ({ correctAnswer, players }) => {
      setGame(prev => prev ? { ...prev, status: "results", correctAnswer, players } : null);
    });

    socket.on("game:next-question", ({ question, index }) => {
      setGame(prev => prev ? { 
        ...prev, 
        status: "playing", 
        currentQuestion: question, 
        questionIndex: index,
        correctAnswer: undefined
      } : null);
      setAnsweredCount(0);
    });

    socket.on("game:ended", (leaderboard) => {
      setGame(prev => prev ? { ...prev, status: "ended", players: leaderboard } : null);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      showNotification("Game completed! Check the podium.", "success");
    });

    socket.on("player:error", (msg) => {
      showNotification(msg, "error");
    });

    return () => {
      socket.off("host:game-created");
      socket.off("host:player-joined");
      socket.off("game:started");
      socket.off("host:answer-received");
      socket.off("game:show-results");
      socket.off("game:next-question");
      socket.off("game:ended");
    };
  }, [socket]);

  if (!game) return <LoadingScreen message="Initializing Game Server..." />;

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen bg-indigo-600 p-8 text-white flex flex-col">
        <div className="flex justify-between items-center mb-12">
          <button onClick={onExit} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
            <LogOut size={24} />
          </button>
          <div className="text-center">
            <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm mb-1">Join at spark.solitrax.net</p>
            <div className="bg-white text-indigo-900 px-10 py-4 rounded-3xl shadow-2xl inline-block">
              <h2 className="text-6xl font-black tracking-tighter">{game.pin}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl">
            <Users size={24} />
            <span className="text-2xl font-bold">{game.players.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {game.players.map((p) => (
                <motion.div 
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="bg-white/20 p-4 rounded-2xl text-center font-bold text-xl backdrop-blur-md border border-white/10"
                >
                  {p.name}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {game.players.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Users size={128} className="mb-4" />
              <p className="text-3xl font-black">WAITING FOR PLAYERS...</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button 
            disabled={game.players.length === 0}
            onClick={() => socket?.emit("host:start-game", game.pin)}
            className="px-16 py-6 bg-green-500 text-white rounded-3xl font-black text-3xl shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 border-b-8 border-green-700 active:border-b-0 active:translate-y-2"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "playing" && game.currentQuestion) {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col p-8 text-white">
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white/10 px-6 py-3 rounded-2xl font-bold text-xl">
            {game.questionIndex + 1} of {game.totalQuestions}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 px-6 py-3 rounded-2xl font-bold text-xl flex items-center gap-2">
              <Users size={20} /> {answeredCount} / {game.players.length}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full">
          <motion.h2 
            key={game.questionIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black mb-12 leading-tight"
          >
            {game.currentQuestion.text}
          </motion.h2>
          
          <div className="grid grid-cols-2 gap-6 w-full">
            {game.currentQuestion.options.map((opt, i) => (
              <div key={i} className={`${COLORS[i]} p-8 rounded-3xl text-3xl font-black flex items-center gap-6 shadow-xl border-b-8 border-black/20`}>
                <span className="text-4xl">{SHAPES[i]}</span>
                <span>{opt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (game.status === "results") {
    return (
      <div className="min-h-screen bg-indigo-800 p-8 text-white flex flex-col">
        <h2 className="text-4xl font-black text-center mb-12 uppercase tracking-widest">Question Results</h2>
        
        <div className="flex-1 max-w-2xl mx-auto w-full overflow-y-auto mb-8 bg-black/20 rounded-3xl p-8 backdrop-blur-md">
          <div className="space-y-4">
            {game.players.sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className="flex justify-between items-center bg-white/10 p-5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-black text-indigo-300">#{i + 1}</span>
                  <span className="text-2xl font-bold">{p.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  {p.isCorrect ? <CheckCircle2 className="text-green-400" /> : <XCircle className="text-red-400" />}
                  <span className="text-3xl font-black">{p.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={() => socket?.emit("host:next-question", game.pin)}
            className="px-16 py-6 bg-white text-indigo-900 rounded-3xl font-black text-3xl shadow-2xl hover:scale-105 transition-all border-b-8 border-gray-300 flex items-center gap-4"
          >
            NEXT <ChevronRight size={32} />
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "ended") {
    return (
      <div className="min-h-screen bg-indigo-900 p-8 text-white flex flex-col items-center justify-center">
        <Trophy size={128} className="text-yellow-400 mb-8 animate-bounce" />
        <h2 className="text-6xl font-black mb-12 tracking-tighter">FINAL PODIUM</h2>
        
        <div className="flex items-end gap-4 mb-16 h-64">
          {game.players.slice(0, 3).map((p, i) => {
            const heights = ["h-64", "h-48", "h-32"];
            const colors = ["bg-yellow-500", "bg-gray-400", "bg-orange-500"];
            const order = [1, 0, 2]; // 2nd, 1st, 3rd
            const player = game.players[order[i]];
            if (!player) return null;

            return (
              <div key={player.id} className="flex flex-col items-center gap-4">
                <p className="font-black text-2xl">{player.name}</p>
                <div className={`${colors[order[i]]} ${heights[order[i]]} w-32 rounded-t-3xl flex flex-col items-center justify-center shadow-2xl border-t-4 border-white/20`}>
                  <span className="text-5xl font-black">{order[i] + 1}</span>
                  <span className="font-bold">{player.score}</span>
                </div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={onExit}
          className="px-12 py-5 bg-white text-indigo-900 rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all"
        >
          BACK TO HOME
        </button>
      </div>
    );
  }

  return null;
}

// --- PLAYER VIEW ---
function PlayerView({ socket, onExit, showNotification }: { 
  socket: Socket | null, 
  onExit: () => void,
  showNotification: (m: string, t?: "error" | "info" | "success") => void 
}) {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"join" | "lobby" | "playing" | "results" | "ended">("join");
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on("player:joined", () => {
      setStatus("lobby");
      showNotification("Successfully joined the game!", "success");
    });

    socket.on("player:error", (msg) => {
      showNotification(msg, "error");
    });

    socket.on("game:started", ({ question }) => {
      setCurrentQuestion(question);
      setStatus("playing");
      setHasAnswered(false);
      setIsCorrect(null);
    });

    socket.on("game:next-question", ({ question }) => {
      setCurrentQuestion(question);
      setStatus("playing");
      setHasAnswered(false);
      setIsCorrect(null);
    });

    socket.on("game:show-results", ({ correctAnswer, players }) => {
      const me = players.find((p: any) => p.id === socket.id);
      if (me) {
        setIsCorrect(me.isCorrect);
        setScore(me.score);
      }
      setStatus("results");
    });

    socket.on("game:ended", (leaderboard) => {
      const me = leaderboard.find((p: any) => p.id === socket.id);
      if (me) setScore(me.score);
      setStatus("ended");
    });

    return () => {
      socket.off("player:joined");
      socket.off("player:error");
      socket.off("game:started");
      socket.off("game:next-question");
      socket.off("game:show-results");
      socket.off("game:ended");
    };
  }, [socket]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin && name) {
      socket?.emit("player:join", { pin, name });
    }
  };

  const handleAnswer = (index: number) => {
    if (!hasAnswered) {
      setHasAnswered(true);
      socket?.emit("player:answer", { pin, answerIndex: index });
      showNotification("Answer submitted!", "success");
    }
  };

  if (status === "join") {
    return (
      <div className="min-h-screen bg-indigo-700 flex flex-col items-center justify-center p-6 text-white">
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl text-indigo-900"
        >
          <h2 className="text-4xl font-black mb-8 text-center tracking-tighter">JOIN GAME</h2>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <input 
                type="text" 
                placeholder="GAME PIN" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full p-5 bg-gray-100 rounded-2xl text-2xl font-black text-center focus:ring-4 ring-indigo-300 outline-none transition-all uppercase"
              />
            </div>
            <div>
              <input 
                type="text" 
                placeholder="NICKNAME" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-5 bg-gray-100 rounded-2xl text-2xl font-black text-center focus:ring-4 ring-indigo-300 outline-none transition-all"
              />
            </div>
            <button 
              type="submit"
              className="w-full py-5 bg-indigo-900 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all active:scale-95"
            >
              ENTER
            </button>
          </form>
        </motion.div>
        <button onClick={onExit} className="mt-8 text-indigo-200 font-bold flex items-center gap-2">
          <LogOut size={20} /> BACK TO HOME
        </button>
      </div>
    );
  }

  if (status === "lobby") {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-white/20 p-8 rounded-full mb-8 animate-pulse">
          <User size={64} />
        </div>
        <h2 className="text-4xl font-black mb-2">{name}</h2>
        <p className="text-xl text-indigo-200 font-bold">You're in! See your name on screen?</p>
        <div className="mt-12 bg-white/10 px-8 py-4 rounded-2xl border border-white/10">
          <p className="text-sm uppercase tracking-widest font-bold opacity-60">Game Pin</p>
          <p className="text-3xl font-black">{pin}</p>
        </div>
      </div>
    );
  }

  if (status === "playing") {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="bg-white p-4 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
              {name[0]}
            </div>
            <span className="font-bold">{name}</span>
          </div>
          <div className="bg-indigo-100 px-4 py-2 rounded-xl font-black text-indigo-900">
            {score}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4">
          {!hasAnswered ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
              {currentQuestion?.options.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => handleAnswer(i)}
                  className={`${COLORS[i]} h-full rounded-3xl shadow-xl active:scale-95 transition-all flex items-center justify-center text-white text-6xl font-black border-b-8 border-black/20`}
                >
                  {SHAPES[i]}
                </button>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="bg-indigo-600 p-8 rounded-full mb-6 animate-bounce">
                <CheckCircle2 size={64} className="text-white" />
              </div>
              <h2 className="text-4xl font-black text-indigo-900">ANSWER SUBMITTED!</h2>
              <p className="text-xl text-gray-500 mt-2">Waiting for others...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === "results") {
    return (
      <div className={`min-h-screen ${isCorrect ? "bg-green-500" : "bg-red-500"} flex flex-col items-center justify-center p-6 text-white text-center`}>
        <div className="bg-white/20 p-12 rounded-full mb-8">
          {isCorrect ? <CheckCircle2 size={96} /> : <XCircle size={96} />}
        </div>
        <h2 className="text-6xl font-black mb-4 uppercase tracking-tighter">
          {isCorrect ? "CORRECT!" : "WRONG!"}
        </h2>
        <p className="text-2xl font-bold opacity-80 mb-8">
          {isCorrect ? "+100 Points" : "Better luck next time!"}
        </p>
        <div className="bg-black/20 px-10 py-5 rounded-3xl backdrop-blur-md">
          <p className="text-sm uppercase tracking-widest font-bold opacity-60 mb-1">Current Score</p>
          <p className="text-5xl font-black">{score}</p>
        </div>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Trophy size={96} className="text-yellow-400 mb-8" />
        <h2 className="text-5xl font-black mb-4 tracking-tighter">GAME OVER</h2>
        <p className="text-2xl font-bold text-indigo-200 mb-12">Great effort, {name}!</p>
        <div className="bg-white text-indigo-900 p-10 rounded-3xl shadow-2xl mb-12">
          <p className="text-lg uppercase tracking-widest font-black opacity-40 mb-2">Final Score</p>
          <p className="text-7xl font-black tracking-tighter">{score}</p>
        </div>
        <button 
          onClick={onExit}
          className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all border-b-4 border-indigo-800"
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  return null;
}

// --- UTILS ---
function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-20 h-20 border-8 border-indigo-400 border-t-white rounded-full animate-spin mb-8" />
      <p className="text-2xl font-black tracking-widest animate-pulse uppercase">{message}</p>
    </div>
  );
}
