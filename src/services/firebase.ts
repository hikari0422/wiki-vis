import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp } from 'firebase/firestore';

// Firebase configuration using Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase configuration is provided
const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let auth: ReturnType<typeof getAuth> | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    db = getFirestore(app);
    
    // Set custom parameters if needed
    googleProvider.setCustomParameters({
      prompt: 'select_account'
    });
  } catch (error) {
    console.error('Firebase initialization failed:', error);
  }
}

export { auth, googleProvider, db, isConfigured };

export interface SavedGraph {
  id?: string;
  userId: string;
  title: string;
  rootTitle: string;
  nodes: any[];
  links: any[];
  expandedNodeIds: string[];
  layoutMode: 'hierarchical' | 'radial';
  limit: number;
  createdAt?: Timestamp;
}

/**
 * Sign in with Google using a popup window
 */
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Authentication is not configured. Please fill in your Firebase credentials in the .env file.');
  }
  return signInWithPopup(auth, googleProvider);
};

/**
 * Sign out the current user
 */
export const logout = async () => {
  if (!auth) return;
  return signOut(auth);
};

/**
 * Fetch all saved graphs for a user, sorted client-side by creation date desc
 */
export const getUserSavedGraphs = async (userId: string): Promise<SavedGraph[]> => {
  if (!db) return [];
  try {
    const collRef = collection(db, 'saved_graphs');
    const q = query(collRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const graphs: SavedGraph[] = [];
    querySnapshot.forEach((docSnap) => {
      graphs.push({
        id: docSnap.id,
        ...docSnap.data()
      } as SavedGraph);
    });
    
    // Sort in memory by createdAt desc to avoid composite index requirements
    return graphs.sort((a, b) => {
      const aTime = a.createdAt?.toMillis() || 0;
      const bTime = b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching saved graphs:', error);
    throw error;
  }
};

/**
 * Save current graph to Firestore with a 20 limit constraint
 */
export const saveGraphToFirestore = async (graph: Omit<SavedGraph, 'createdAt'>) => {
  if (!db) {
    throw new Error('Firebase Database is not configured.');
  }

  // 1. Enforce 20 limits check
  const existing = await getUserSavedGraphs(graph.userId);
  if (existing.length >= 20) {
    throw new Error('您已達到 20 個雲端存檔上限，請先至「歷史存檔」中刪除舊的存檔再進行儲存。');
  }

  try {
    // 2. Add document
    const collRef = collection(db, 'saved_graphs');
    return await addDoc(collRef, {
      ...graph,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error saving graph:', error);
    throw error;
  }
};

/**
 * Delete a saved graph
 */
export const deleteSavedGraph = async (docId: string) => {
  if (!db) return;
  try {
    const docRef = doc(db, 'saved_graphs', docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting graph:', error);
    throw error;
  }
};
