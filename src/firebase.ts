import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged, 
  User,
  browserPopupRedirectResolver,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// These will be populated by the user in the Firebase setup UI or manually
const getFirebaseConfig = () => {
  // Try environment variables first
  const envConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  // Check if env variables are valid
  const isEnvValid = !!envConfig.apiKey && 
    envConfig.apiKey !== "MY_FIREBASE_API_KEY" && 
    !envConfig.apiKey.includes("TODO");

  if (isEnvValid) return envConfig;

  // Fallback to localStorage
  try {
    const localConfigStr = localStorage.getItem("firebase_config_override");
    if (localConfigStr) {
      const localConfig = JSON.parse(localConfigStr);
      if (localConfig.apiKey) return localConfig;
    }
  } catch (e) {
    console.error("Failed to parse local firebase config", e);
  }

  return envConfig;
};

const firebaseConfig = getFirebaseConfig();

// Check if configuration is present to avoid initialization errors
const isFirebaseConfigured = !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "MY_FIREBASE_API_KEY" && 
  !firebaseConfig.apiKey.includes("TODO");

let app;
let auth: any;
let db: any;
let googleProvider: any;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    
    // Explicitly set persistence to local
    setPersistence(auth, browserLocalPersistence).catch(err => {
      console.error("Failed to set persistence:", err);
    });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { 
  auth, 
  db, 
  googleProvider, 
  isFirebaseConfigured, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  browserPopupRedirectResolver
};
export type { User };
