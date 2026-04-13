import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc, 
  getDocFromServer,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  deleteField,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Set persistence
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Failed to set persistence:", err);
});

// Connection test as per critical directive
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
}
testConnection();

export { 
  doc, 
  collection, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  getDoc, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  deleteField,
  writeBatch
};
