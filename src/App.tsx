// MindSpark v3.0 - Firebase Online Version
import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from "react";
import { 
  Trophy, 
  Users, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Timer, 
  Layout, 
  User as UserIcon, 
  Settings, 
  LogOut, 
  ChevronRight, 
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  LogIn,
  Plus,
  Trash2,
  Save,
  Edit3
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  doc,
  collection,
  setDoc,
  updateDoc,
  onSnapshot,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  deleteField,
  writeBatch
} from "./firebase";
import { serverTimestamp, Timestamp } from "firebase/firestore";

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
  leaderboard?: Player[];
  hostId: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
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
  },
  {
    text: "Who painted the Mona Lisa?",
    options: ["Van Gogh", "Picasso", "Da Vinci", "Monet"],
    correctAnswer: 2,
    timeLimit: 20
  },
  {
    text: "What is the largest ocean on Earth?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctAnswer: 3,
    timeLimit: 20
  }
];

const COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600"
];

const SHAPES = ["▲", "◆", "●", "■"];

// --- UTILS ---
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="w-20 h-20 border-8 border-indigo-400 border-t-white rounded-full animate-spin mb-8" />
      <p className="text-2xl font-black tracking-widest animate-pulse uppercase">{message}</p>
    </div>
  );
}

// --- ERROR BOUNDARY ---
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-900 flex flex-col items-center justify-center p-6 text-white text-center">
          <AlertCircle size={64} className="mb-6" />
          <h1 className="text-4xl font-black mb-4">Ouch! Something went wrong.</h1>
          <p className="text-xl opacity-80 mb-8 max-w-md">
            MindSpark encountered an unexpected error. Please try refreshing the page.
          </p>
          <div className="bg-black/20 p-4 rounded-xl text-left font-mono text-xs overflow-auto max-w-full mb-8">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white text-red-900 rounded-2xl font-black shadow-xl hover:scale-105 transition-all"
          >
            REFRESH PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// --- MAIN APP ---
export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [view, setView] = useState<"landing" | "host" | "player">("landing");
  const [notification, setNotification] = useState<{ message: string; type: "error" | "info" | "success" } | null>(null);

  useEffect(() => {
    if (isAuthReady) {
      const savedPin = localStorage.getItem("mindspark_active_pin");
      const savedRole = localStorage.getItem("mindspark_user_role");
      if (savedPin && (savedRole === "host" || savedRole === "player")) {
        setView(savedRole as "host" | "player");
      }
    }
  }, [isAuthReady]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const showNotification = (message: string, type: "error" | "info" | "success" = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showNotification("Logged in successfully!", "success");
    } catch (err) {
      showNotification("Login failed", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem("mindspark_active_pin");
      localStorage.removeItem("mindspark_user_role");
      localStorage.removeItem("mindspark_player_name");
      setView("landing");
      showNotification("Logged out", "info");
    } catch (err) {
      showNotification("Logout failed", "error");
    }
  };

  if (!isAuthReady) return <LoadingScreen message="Connecting to MindSpark..." />;

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
        <div className="absolute top-4 right-4 z-20">
          {user ? (
            <div className="flex items-center gap-3 bg-white/10 p-2 pr-4 rounded-full backdrop-blur-md border border-white/10">
              <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border-2 border-white/20" referrerPolicy="no-referrer" />
              <div className="hidden sm:block">
                <p className="text-xs font-bold opacity-60 uppercase">Logged in as</p>
                <p className="text-sm font-black">{user.displayName}</p>
              </div>
              <button onClick={handleLogout} className="ml-2 p-2 hover:bg-white/10 rounded-full transition-all">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="px-6 py-3 bg-white text-indigo-900 rounded-full font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
            >
              <LogIn size={20} /> LOGIN TO PLAY
            </button>
          )}
        </div>

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
              onClick={() => {
                if (!user) return showNotification("Please login to host a game", "error");
                setView("host");
              }}
              className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all active:scale-95 border-b-4 border-indigo-800 flex items-center gap-3"
            >
              <Play size={28} /> HOST GAME
            </button>
          </div>
          
          <p className="mt-8 text-indigo-300 font-bold text-sm opacity-50">
            ONLINE VERSION - REAL-TIME MULTIPLAYER
          </p>
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
        <HostView user={user} onExit={() => setView("landing")} showNotification={showNotification} />
      ) : (
        <PlayerView user={user} onExit={() => setView("landing")} showNotification={showNotification} />
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
function HostView({ user, onExit, showNotification }: { 
  user: any, 
  onExit: () => void,
  showNotification: (m: string, t?: "error" | "info" | "success") => void 
}) {
  const [game, setGame] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isCreating, setIsCreating] = useState(true);
  const [customQuestions, setCustomQuestions] = useState<Question[]>(DEFAULT_QUESTIONS);

  const handleExit = () => {
    localStorage.removeItem("mindspark_active_pin");
    localStorage.removeItem("mindspark_user_role");
    onExit();
  };

  const answeredCount = players.filter(p => p.lastAnswer !== null && p.lastAnswer !== undefined).length;

  // Auto-move to results if everyone answered
  useEffect(() => {
    if (game && players.length > 0 && answeredCount === players.length && game.status === "playing") {
      updateDoc(doc(db, "games", game.pin), { status: "results" });
    }
  }, [answeredCount, players.length, game?.status, game?.pin]);

  const createGame = async (questions: Question[]) => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const gameRef = doc(db, "games", pin);
    
    const newGame = {
      pin,
      status: "lobby",
      hostId: user.uid,
      currentQuestionIndex: 0,
      totalQuestions: questions.length,
      createdAt: serverTimestamp(),
      questions: questions
    };

    try {
      await setDoc(gameRef, newGame);
      localStorage.setItem("mindspark_active_pin", pin);
      localStorage.setItem("mindspark_user_role", "host");
      setGame({
        ...newGame,
        createdAt: new Date() as any,
        players: []
      } as any);
      setIsCreating(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `games/${pin}`);
    }
  };

  const startGame = async () => {
    if (!game) return;
    try {
      await updateDoc(doc(db, "games", game.pin), { status: "playing" });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${game.pin}`);
    }
  };

  const nextQuestion = async () => {
    if (!game) return;
    const isLast = game.questionIndex >= game.totalQuestions - 1;
    try {
      const batch = writeBatch(db);
      
      if (isLast) {
        batch.update(doc(db, "games", game.pin), { status: "ended" });
      } else {
        // Reset players' answers for next question using deleteField
        // and update game state in the same atomic batch
        players.forEach(p => {
          batch.update(doc(db, "games", game.pin, "players", p.id), {
            lastAnswer: deleteField(),
            isCorrect: deleteField()
          });
        });

        batch.update(doc(db, "games", game.pin), { 
          status: "playing",
          currentQuestionIndex: game.questionIndex + 1
        });
      }
      
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `games/${game.pin}`);
    }
  };

  useEffect(() => {
    // Check for existing session
    const savedPin = localStorage.getItem("mindspark_active_pin");
    const savedRole = localStorage.getItem("mindspark_user_role");
    
    if (savedPin && savedRole === "host") {
      getDoc(doc(db, "games", savedPin)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.hostId === user.uid) {
            setGame({
              pin: savedPin,
              status: data.status,
              hostId: data.hostId,
              questionIndex: data.currentQuestionIndex,
              totalQuestions: data.totalQuestions,
              questions: data.questions,
              players: []
            } as any);
            setIsCreating(false);
          } else {
            handleExit();
          }
        } else {
          handleExit();
        }
      }).catch(() => handleExit());
    }
  }, [user?.uid]);

  // Sync Game State
  useEffect(() => {
    if (!game?.pin) return;
    const unsubscribe = onSnapshot(doc(db, "games", game.pin), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setGame(prev => ({
          ...prev!,
          status: data.status,
          questionIndex: data.currentQuestionIndex,
          currentQuestion: data.questions[data.currentQuestionIndex]
        }));
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `games/${game.pin}`));
    return () => unsubscribe();
  }, [game?.pin]);

  // Sync Players
  useEffect(() => {
    if (!game?.pin) return;
    const unsubscribe = onSnapshot(collection(db, "games", game.pin, "players"), (snapshot) => {
      const pList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Player));
      setPlayers(pList);
    }, (err) => handleFirestoreError(err, OperationType.GET, `games/${game.pin}/players`));
    return () => unsubscribe();
  }, [game?.pin]);

  if (isCreating) {
    return (
      <div className="min-h-screen bg-indigo-900 p-8 text-white flex flex-col items-center">
        <div className="w-full max-w-4xl">
          <div className="flex justify-between items-center mb-8">
            <button onClick={handleExit} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
              <LogOut size={24} />
            </button>
            <h2 className="text-3xl font-black tracking-tighter">QUIZ CREATOR</h2>
            <div className="w-12" />
          </div>

          <div className="space-y-6 mb-12">
            {customQuestions.map((q, qIdx) => (
              <motion.div 
                key={qIdx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-white/10 p-6 rounded-3xl border border-white/10 backdrop-blur-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-indigo-500 px-4 py-1 rounded-full text-xs font-black uppercase">Question {qIdx + 1}</span>
                  <button 
                    onClick={() => setCustomQuestions(prev => prev.filter((_, i) => i !== qIdx))}
                    className="text-red-400 hover:text-red-300 transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                
                <input 
                  type="text"
                  value={q.text}
                  onChange={(e) => {
                    const newQs = [...customQuestions];
                    newQs[qIdx].text = e.target.value;
                    setCustomQuestions(newQs);
                  }}
                  placeholder="Enter your question here..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const newQs = [...customQuestions];
                          newQs[qIdx].correctAnswer = oIdx;
                          setCustomQuestions(newQs);
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                          q.correctAnswer === oIdx ? "bg-green-500 text-white scale-110 shadow-lg" : "bg-white/10 text-white/40 hover:bg-white/20"
                        }`}
                      >
                        {q.correctAnswer === oIdx ? <CheckCircle2 size={20} /> : SHAPES[oIdx]}
                      </button>
                      <input 
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newQs = [...customQuestions];
                          newQs[qIdx].options[oIdx] = e.target.value;
                          setCustomQuestions(newQs);
                        }}
                        placeholder={`Option ${oIdx + 1}`}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center sticky bottom-8">
            <button 
              onClick={() => setCustomQuestions(prev => [...prev, { text: "", options: ["", "", "", ""], correctAnswer: 0, timeLimit: 20 }])}
              className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black flex items-center gap-2 shadow-xl hover:scale-105 transition-all"
            >
              <Plus size={24} /> ADD QUESTION
            </button>
            <button 
              onClick={() => {
                if (customQuestions.some(q => !q.text || q.options.some(o => !o))) {
                  return showNotification("Please fill in all questions and options", "error");
                }
                createGame(customQuestions);
              }}
              className="px-12 py-4 bg-green-500 text-white rounded-2xl font-black text-xl flex items-center gap-2 shadow-xl hover:scale-105 transition-all border-b-4 border-green-700 active:border-b-0 active:translate-y-1"
            >
              <Save size={24} /> CREATE GAME
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game) return <LoadingScreen message="Initializing Online Game..." />;

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen bg-indigo-600 p-8 text-white flex flex-col">
        <div className="flex justify-between items-center mb-12">
          <div className="flex gap-2">
            <button onClick={handleExit} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all">
              <LogOut size={24} />
            </button>
            <button onClick={() => setIsCreating(true)} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2">
              <Edit3 size={24} /> <span className="font-bold hidden sm:inline">EDIT QUIZ</span>
            </button>
          </div>
          <div className="text-center">
            <p className="text-indigo-200 font-bold uppercase tracking-widest text-sm mb-1">Join at MindSpark Online</p>
            <div className="bg-white text-indigo-900 px-10 py-4 rounded-3xl shadow-2xl inline-block">
              <h2 className="text-6xl font-black tracking-tighter">{game.pin}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/10 px-6 py-3 rounded-2xl">
            <Users size={24} />
            <span className="text-2xl font-bold">{players.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <AnimatePresence>
              {players.map((p) => (
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
          {players.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40">
              <Users size={128} className="mb-4" />
              <p className="text-3xl font-black">WAITING FOR PLAYERS...</p>
            </div>
          )}
        </div>

        <div className="flex justify-center">
          <button 
            disabled={players.length === 0}
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
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col p-8 text-white">
        <div className="flex justify-between items-center mb-8">
          <div className="bg-white/10 px-6 py-3 rounded-2xl font-bold text-xl">
            {game.questionIndex + 1} of {game.totalQuestions}
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/10 px-6 py-3 rounded-2xl font-bold text-xl flex items-center gap-2">
              <Users size={20} /> {answeredCount} / {players.length}
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
            {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
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
    const leaderboard = [...players].sort((a, b) => b.score - a.score);
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
          onClick={handleExit}
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
function PlayerView({ user, onExit, showNotification }: { 
  user: any, 
  onExit: () => void,
  showNotification: (m: string, t?: "error" | "info" | "success") => void 
}) {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [game, setGame] = useState<any>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleExit = () => {
    localStorage.removeItem("mindspark_active_pin");
    localStorage.removeItem("mindspark_user_role");
    localStorage.removeItem("mindspark_player_name");
    onExit();
  };

  // Sync Game State
  useEffect(() => {
    if (!pin || !game) return;
    const unsubscribe = onSnapshot(doc(db, "games", pin), (snapshot) => {
      if (snapshot.exists()) {
        setGame(snapshot.data());
      } else {
        showNotification("Game not found", "error");
        onExit();
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `games/${pin}`));
    return () => unsubscribe();
  }, [pin, !!game]);

  // Sync My Player State
  useEffect(() => {
    if (!pin || !user || !game) return;
    const unsubscribe = onSnapshot(doc(db, "games", pin, "players", user.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Player;
        setMe(data);
        setHasAnswered(data.lastAnswer !== null && data.lastAnswer !== undefined);
      } else if (game.status !== "lobby") {
        // If player document is gone but game is active, they might have been kicked or error
        handleExit();
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `games/${pin}/players/${user.uid}`));
    return () => unsubscribe();
  }, [pin, user?.uid, !!game]);

  useEffect(() => {
    // Check for existing session
    const savedPin = localStorage.getItem("mindspark_active_pin");
    const savedRole = localStorage.getItem("mindspark_user_role");
    const savedName = localStorage.getItem("mindspark_player_name");
    
    if (savedPin && savedRole === "player" && savedName) {
      setPin(savedPin);
      setName(savedName);
      getDoc(doc(db, "games", savedPin)).then(snap => {
        if (snap.exists()) {
          setGame(snap.data());
        } else {
          handleExit();
        }
      }).catch(() => handleExit());
    }
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return showNotification("Please login to join", "error");
    if (pin && name) {
      try {
        const gameSnap = await getDoc(doc(db, "games", pin));
        if (!gameSnap.exists()) throw new Error("Game not found");
        if (gameSnap.data().status !== "lobby") throw new Error("Game already started");

        const playerRef = doc(db, "games", pin, "players", user.uid);
        await setDoc(playerRef, {
          id: user.uid,
          name,
          score: 0,
          joinedAt: serverTimestamp()
        });
        
        localStorage.setItem("mindspark_active_pin", pin);
        localStorage.setItem("mindspark_user_role", "player");
        localStorage.setItem("mindspark_player_name", name);

        setGame(gameSnap.data());
        showNotification("Successfully joined the game!", "success");
      } catch (err) {
        showNotification(err instanceof Error ? err.message : "Failed to join", "error");
      }
    }
  };

  const handleAnswer = async (index: number) => {
    if (!hasAnswered && me && game) {
      setHasAnswered(true);
      const isCorrect = index === game.questions[game.currentQuestionIndex].correctAnswer;
      try {
        await updateDoc(doc(db, "games", pin, "players", user.uid), {
          lastAnswer: index,
          isCorrect: isCorrect,
          score: isCorrect ? me.score + 100 : me.score
        });
        showNotification("Answer submitted!", "success");
      } catch (err) {
        setHasAnswered(false);
        showNotification("Failed to submit answer", "error");
      }
    }
  };

  if (!game) {
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
        <button onClick={handleExit} className="mt-8 text-indigo-200 font-bold flex items-center gap-2">
          <LogOut size={20} /> BACK TO HOME
        </button>
      </div>
    );
  }

  if (game.status === "lobby") {
    return (
      <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="bg-white/20 p-8 rounded-full mb-8 animate-pulse">
          <UserIcon size={64} />
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

  if (game.status === "playing") {
    const currentQ = game.questions[game.currentQuestionIndex];
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
            {me?.score || 0}
          </div>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4">
          {!hasAnswered ? (
            <>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 mb-2">
                <h2 className="text-2xl font-black text-indigo-900 leading-tight">
                  {currentQ?.text}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {currentQ?.options.map((opt, i) => (
                  <button 
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={`${COLORS[i]} p-6 rounded-3xl shadow-xl active:scale-95 transition-all flex items-center gap-4 text-white border-b-8 border-black/20 text-left`}
                  >
                    <span className="text-4xl font-black opacity-40 shrink-0">{SHAPES[i]}</span>
                    <span className="text-xl font-bold leading-tight">{opt}</span>
                  </button>
                ))}
              </div>
            </>
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

  if (game.status === "results") {
    return (
      <div className={`min-h-screen ${me?.isCorrect ? "bg-green-500" : "bg-red-500"} flex flex-col items-center justify-center p-6 text-white text-center`}>
        <div className="bg-white/20 p-12 rounded-full mb-8">
          {me?.isCorrect ? <CheckCircle2 size={96} /> : <XCircle size={96} />}
        </div>
        <h2 className="text-6xl font-black mb-4 uppercase tracking-tighter">
          {me?.isCorrect ? "CORRECT!" : "WRONG!"}
        </h2>
        <p className="text-2xl font-bold opacity-80 mb-8">
          {me?.isCorrect ? "+100 Points" : "Better luck next time!"}
        </p>
        <div className="bg-black/20 px-10 py-5 rounded-3xl backdrop-blur-md">
          <p className="text-sm uppercase tracking-widest font-bold opacity-60 mb-1">Current Score</p>
          <p className="text-5xl font-black">{me?.score || 0}</p>
        </div>
      </div>
    );
  }

  if (game.status === "ended") {
    return (
      <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <Trophy size={96} className="text-yellow-400 mb-8" />
        <h2 className="text-5xl font-black mb-4 tracking-tighter">GAME OVER</h2>
        <p className="text-2xl font-bold text-indigo-200 mb-12">Great effort, {name}!</p>
        <div className="bg-white text-indigo-900 p-10 rounded-3xl shadow-2xl mb-12">
          <p className="text-lg uppercase tracking-widest font-black opacity-40 mb-2">Final Score</p>
          <p className="text-7xl font-black tracking-tighter">{me?.score || 0}</p>
        </div>
        <button 
          onClick={handleExit}
          className="px-12 py-5 bg-indigo-600 text-white rounded-2xl font-black text-2xl shadow-xl hover:scale-105 transition-all border-b-4 border-indigo-800"
        >
          PLAY AGAIN
        </button>
      </div>
    );
  }

  return null;
}
