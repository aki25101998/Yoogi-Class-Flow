// Authentication module — Google OAuth with Firebase
import { firebaseConfig } from './firebase-config.js';

const { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup, signOut: fbSignOut, onAuthStateChanged: fbOnAuthStateChanged, getFirestore, doc, getDoc, setDoc, getDocs, collection, Timestamp, query, where } = window.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// Current user state
let currentUser = null;
let currentUserData = null;

let isLoggingIn = false;

/**
 * Sign in with Google popup
 * @returns {Promise<{user: object, userData: object}>}
 */
export async function signInWithGoogle() {
  isLoggingIn = true;
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if this user exists in coaches collection by email
    const q = query(collection(db, 'coaches'), where('email', '==', user.email.toLowerCase().trim()));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      const userDoc = snap.docs[0];
      currentUserData = { id: userDoc.id, ...userDoc.data() };
      
      if (globalAuthCallback) {
        globalAuthCallback(user, currentUserData);
      }
      return { user, userData: currentUserData };
    }
    
    // Check if any coaches exist at all — if not, make this user the admin
    const coachesSnap = await getDocs(collection(db, 'coaches'));
    if (coachesSnap.empty) {
      const adminData = {
        name: user.displayName || 'Admin',
        email: user.email,
        phone: '',
        role: 'admin',
        rateType: 'per_session',
        defaultRate: 0,
        status: 'active',
        photoURL: user.photoURL || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      await setDoc(doc(db, 'coaches', user.uid), adminData);
      currentUserData = { id: user.uid, ...adminData };
      
      // Notify listener manually since we skipped it
      if (globalAuthCallback) {
        globalAuthCallback(user, currentUserData);
      }
      return { user, userData: currentUserData };
    }
    
    // User not in system and not first user — unauthorized
    await fbSignOut(auth);
    throw new Error('UNAUTHORIZED:' + user.email);
  } finally {
    isLoggingIn = false;
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  currentUser = null;
  currentUserData = null;
  await fbSignOut(auth);
}

let globalAuthCallback = null;

/**
 * Listen for auth state changes
 * @param {Function} callback - receives (user, userData) or (null, null)
 */
export function onAuthStateChange(callback) {
  globalAuthCallback = callback;
  fbOnAuthStateChanged(auth, async (user) => {
    if (user) {
      if (isLoggingIn) return; // Skip handling here if signInWithGoogle is doing it
      currentUser = user;
      try {
        const q = query(collection(db, 'coaches'), where('email', '==', user.email.toLowerCase().trim()));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          currentUserData = { id: userDoc.id, ...userDoc.data() };
          callback(user, currentUserData);
        } else {
          // User not in system
          await fbSignOut(auth);
          callback(null, null);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        callback(null, null);
      }
    } else {
      currentUser = null;
      currentUserData = null;
      callback(null, null);
    }
  });
}

/**
 * Get current Firebase user
 * @returns {object|null}
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current user data from Firestore
 * @returns {object|null}
 */
export function getCurrentUserData() {
  return currentUserData;
}

/**
 * Check if current user is admin
 * @returns {boolean}
 */
export function isAdmin() {
  return currentUserData?.role === 'admin';
}

/**
 * Get Firestore database instance
 * @returns {object}
 */
export function getDb() {
  return db;
}

/**
 * Get Firebase Auth instance
 * @returns {object}
 */
export function getAuthInstance() {
  return auth;
}
