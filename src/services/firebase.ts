import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, Timestamp, setDoc, increment, getDoc, orderBy, limit } from 'firebase/firestore';

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
  layoutMode: 'hierarchical' | 'radial' | 'free';
  limit: number;
  viewMode?: '2d' | '3d';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  exploredLinksMap?: { [nodeId: string]: string[] };
  clickHistory?: any[];
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
 * Fetch all saved graphs for a user, sorted client-side by creation/update date desc
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
    
    // Sort in memory by updatedAt or createdAt desc
    return graphs.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
      const bTime = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching saved graphs:', error);
    throw error;
  }
};

/**
 * Save current graph to Firestore:
 * - If user already has a saved graph with the same rootTitle, we OVERWRITE it.
 * - Otherwise, we check if they already have 20 saves. If yes, throw limit error.
 * - If not, we create a NEW save.
 */
export const saveGraphToFirestore = async (graph: Omit<SavedGraph, 'createdAt' | 'updatedAt'>): Promise<{ id: string, operation: 'create' | 'update' }> => {
  if (!db) {
    throw new Error('Firebase Database is not configured.');
  }

  // 1. Fetch all existing graphs for the user
  const existing = await getUserSavedGraphs(graph.userId);

  // 2. Find if any graph matches the current rootTitle
  const matchedGraph = existing.find(g => g.rootTitle === graph.rootTitle);

  // Sanitize graph to remove undefined values which Firestore rejects
  const sanitizedGraph = JSON.parse(JSON.stringify(graph));

  try {
    if (matchedGraph && matchedGraph.id) {
      // Overwrite the existing document
      const docRef = doc(db, 'saved_graphs', matchedGraph.id);
      
      await setDoc(docRef, {
        ...sanitizedGraph,
        createdAt: matchedGraph.createdAt || Timestamp.now(), // Preserve original creation time
        updatedAt: Timestamp.now(), // Update modification time
      });
      
      return { id: matchedGraph.id, operation: 'update' };
    } else {
      // New save. Enforce 20 limit check first.
      if (existing.length >= 20) {
        throw new Error('您已達到 20 個雲端存檔上限，請先至「歷史存檔」中刪除舊的存檔再進行儲存。');
      }

      // Add new document
      const collRef = collection(db, 'saved_graphs');
      const docRef = await addDoc(collRef, {
        ...sanitizedGraph,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      return { id: docRef.id, operation: 'create' };
    }
  } catch (error) {
    console.error('Error in saveGraphToFirestore:', error);
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

/**
 * 紀錄全站單一節點的點擊次數 (Global Node Stats)
 */
export const recordNodeClick = async (title: string) => {
  if (!db) return;
  try {
    // 標題可能包含斜線或特殊字元，Firestore 文件 ID 不允許包含斜線
    const safeId = encodeURIComponent(title);
    const docRef = doc(db, 'global_node_stats', safeId);
    await setDoc(docRef, {
      title,
      clickCount: increment(1),
      lastClicked: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error recording node click:', error);
  }
};

/**
 * 紀錄單次探索的總結 (Global Session Stats)
 */
export const recordSessionStats = async (nodesCount: number, maxDepth: number) => {
  if (!db || nodesCount <= 0) return;
  try {
    const docRef = doc(db, 'global_metrics', 'overall');
    await setDoc(docRef, {
      totalSessions: increment(1),
      totalNodesExplored: increment(nodesCount),
      totalDepthSum: increment(maxDepth)
    }, { merge: true });
  } catch (error) {
    console.error('Error recording session stats:', error);
  }
};

/**
 * 取得全站統計數據 (Top 10 Nodes & Averages)
 */
export const getGlobalStats = async () => {
  if (!db) return { topNodes: [], averageNodes: 0, averageDepth: 0 };
  
  try {
    // 1. Get average metrics
    const metricsRef = doc(db, 'global_metrics', 'overall');
    const metricsSnap = await getDoc(metricsRef);
    let averageNodes = 0;
    let averageDepth = 0;
    
    if (metricsSnap.exists()) {
      const data = metricsSnap.data();
      if (data.totalSessions > 0) {
        averageNodes = Math.round((data.totalNodesExplored / data.totalSessions) * 10) / 10;
        averageDepth = Math.round((data.totalDepthSum / data.totalSessions) * 10) / 10;
      }
    }

    // 2. Get top 10 nodes
    const nodesRef = collection(db, 'global_node_stats');
    const q = query(nodesRef, orderBy('clickCount', 'desc'), limit(10));
    const nodeSnaps = await getDocs(q);
    const topNodes = nodeSnaps.docs.map(d => ({
      title: d.data().title,
      clickCount: d.data().clickCount
    }));

    return { topNodes, averageNodes, averageDepth };
  } catch (error) {
    console.error('Error getting global stats:', error);
    return { topNodes: [], averageNodes: 0, averageDepth: 0 };
  }
};
