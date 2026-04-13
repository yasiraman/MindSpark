// MindSpark v2.0 - REST API Version
import React, { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";

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

export default function App() {
  const [view, setView] = useState<"landing" | "host" | "player">("landing");
  const [notification, setNotification] = useState<{ message: string; type: "error" | "info" | "success" } | null>(null);
  const [playerId] = useState(() => {
    const saved = localStorage.getItem("quiz_player_id");
    if (saved) return saved;
    const id = uuidv4();
    localStorage.setItem("quiz_player_id", id);
    return id;
  });
  const [hostId] = useState(() => {
    const saved = localStorage.getItem("quiz_host_id");
    if (saved) return saved;
    const id = uuidv4();
    localStorage.setItem("quiz_host_id", id);
    return id;
  });

  const showNotification = (message: string, type: "error" | "info" | "success" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const testApi = async () => {
    try {
      showNotification("Testing API connectivity...", "info");
      const res = await fetch("/api/v1/test-text");
      const text = await res.text();
      
      if (text.includes("API_IS_WORKING_FINE")) {
        showNotification("API is reachable!", "success");
      } else {
        showNotification(`API returned: ${text.slice(0, 30)}...`, "error");
      }
    } catch (err) {
      showNotification(`API Unreachable: ${err instanceof Error ? err.message : String(err)}`, "error");
    }
  };

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
            MIND<span className="text-indigo-400">SPARK</span>
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
          
          <button 
            onClick={testApi}
            className="mt-8 text-indigo-300 font-bold text-sm hover:text-white transition-all flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={14} /> TEST API CONNECTIVITY
          </button>
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {view === "host" ? (
        <HostView hostId={hostId} onExit={() => setView("landing")} showNotification={showNotification} />
      ) : (
        <PlayerView playerId={playerId} onExit={() => setView("landing")} showNotification={showNotification} />
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
    </div>
  );
}

// --- HOST VIEW ---
function HostView({ hostId, onExit, showNotification }: { 
  hostId: string, 
  onExit: () => void,
  showNotification: (m: string, t?: "error" | "info" | "success") => void 
}) {
  const [game, setGame] = useState<GameState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState("");

  const createGame = async (questions: Question[]) => {
    try {
      const res = await fetch("/api/v1/game/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions, hostId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setGame({
        pin: data.pin,
        status: "lobby",
        questionIndex: 0,
        totalQuestions: questions.length,
        players: []
      });
    } catch (err) {
      showNotification("Failed to create game", "error");
    }
  };

  const startGame = async () => {
    if (!game) return;
    try {
      const res = await fetch("/api/v1/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: game.pin, hostId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) {
      showNotification("Failed to start game", "error");
    }
  };

  const nextQuestion = async () => {
    if (!game) return;
    try {
      const res = await fetch("/api/v1/game/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: game.pin, hostId })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err) {
      showNotification("Failed to move to next question", "error");
    }
  };

  const generateWithAI = async () => {
    if (!topic) return showNotification("Please enter a topic", "error");
    
    setIsGenerating(true);
    try {
      const res = await fetch("/api/v1/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      await createGame(data);
      showNotification(`Generated ${data.length} questions about ${topic}!`, "success");
    } catch (err) {
      showNotification(`AI Error: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    createGame(DEFAULT_QUESTIONS);
  }, []);

  // Polling
  useEffect(() => {
    if (!game?.pin) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/game/${game.pin}?hostId=${hostId}`);
        if (!res.ok) throw new Error("Game not found");
        const data = await res.json();
        
        setGame(prev => ({
          ...prev!,
          status: data.status,
          currentQuestion: data.question,
          questionIndex: data.currentQuestionIndex,
          totalQuestions: data.totalQuestions,
          players: data.players,
          correctAnswer: data.correctAnswer,
          leaderboard: data.leaderboard
        }));
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [game?.pin]);

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
          <div className="max-w-xl mx-auto mb-12 bg-white/10 p-6 rounded-3xl backdrop-blur-md border border-white/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <RefreshCw size={20} className={isGenerating ? "animate-spin" : ""} />
              GENERATE CUSTOM QUIZ WITH AI
            </h3>
            <div className="flex gap-3">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter topic (e.g. Space, History, Anime...)"
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-white/30"
              />
              <button 
                onClick={generateWithAI}
                disabled={isGenerating}
                className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-black hover:scale-105 transition-all disabled:opacity-50"
              >
                {isGenerating ? "GENERATING..." : "GENERATE"}
              </button>
            </div>
          </div>

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
            onClick={startGame}
            className="px-16 py-6 bg-green-500 text-white rounded-3xl font-black text-3xl shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 border-b-8 border-green-700 active:border-b-0 active:translate-y-2"
          >
            START GAME
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "playing" && game.currentQuestion) {
    const answeredCount = game.players.filter(p => p.lastAnswer !== undefined).length;
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
            onClick={nextQuestion}
            className="px-16 py-6 bg-white text-indigo-900 rounded-3xl font-black text-3xl shadow-2xl hover:scale-105 transition-all border-b-8 border-gray-300 flex items-center gap-4"
          >
            NEXT <ChevronRight size={32} />
          </button>
        </div>
      </div>
    );
  }

  if (game.status === "ended") {
    const leaderboard = (game as any).leaderboard || game.players.sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen bg-indigo-900 p-8 text-white flex flex-col items-center justify-center">
        <Trophy size={128} className="text-yellow-400 mb-8 animate-bounce" />
        <h2 className="text-6xl font-black mb-12 tracking-tighter">FINAL PODIUM</h2>
        
        <div className="flex items-end gap-4 mb-16 h-64">
          {[1, 0, 2].map((orderIdx, i) => {
            const heights = ["h-64", "h-48", "h-32"];
            const colors = ["bg-yellow-500", "bg-gray-400", "bg-orange-500"];
            const player = leaderboard[orderIdx];
            if (!player) return <div key={i} className="w-32" />;

            return (
              <div key={player.id} className="flex flex-col items-center gap-4">
                <p className="font-black text-2xl">{player.name}</p>
                <div className={`${colors[orderIdx]} ${heights[orderIdx]} w-32 rounded-t-3xl flex flex-col items-center justify-center shadow-2xl border-t-4 border-white/20`}>
                  <span className="text-5xl font-black">{orderIdx + 1}</span>
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
function PlayerView({ playerId, onExit, showNotification }: { 
  playerId: string, 
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

  // Polling
  useEffect(() => {
    if (status === "join" || !pin) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/v1/game/${pin}?playerId=${playerId}`);
        if (!res.ok) {
          showNotification("Game ended or not found", "error");
          onExit();
          return;
        }
        const data = await res.json();
        
        setStatus(data.status);
        if (data.status === "playing") {
          setCurrentQuestion(data.question);
          setHasAnswered(data.hasAnswered);
        } else if (data.status === "results") {
          const me = data.playerResults.find((p: any) => p.id === playerId);
          if (me) {
            setIsCorrect(me.isCorrect);
            setScore(me.score);
          }
        } else if (data.status === "ended") {
          const me = data.leaderboard.find((p: any) => p.id === playerId);
          if (me) setScore(me.score);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [status, pin]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin && name) {
      try {
        const res = await fetch("/api/v1/game/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, name, playerId })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        
        setStatus("lobby");
        showNotification("Successfully joined the game!", "success");
      } catch (err) {
        showNotification(err instanceof Error ? err.message : "Failed to join", "error");
      }
    }
  };

  const handleAnswer = async (index: number) => {
    if (!hasAnswered) {
      setHasAnswered(true);
      try {
        const res = await fetch("/api/v1/game/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin, playerId, answerIndex: index })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showNotification("Answer submitted!", "success");
      } catch (err) {
        setHasAnswered(false);
        showNotification("Failed to submit answer", "error");
      }
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
