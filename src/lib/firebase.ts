import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { LogEntry } from '../types';

const app = initializeApp(firebaseConfig);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile };

export async function logActivity(entry: Omit<LogEntry, 'id' | 'timestamp' | 'adminId' | 'adminEmail'>) {
  try {
    const user = auth.currentUser;
    const logData: any = {
      ...entry,
      timestamp: serverTimestamp()
    };

    if (user) {
      logData.adminId = user.uid;
      logData.adminEmail = user.email || 'unknown';
      logData.adminName = user.displayName || undefined;
    } else {
      logData.adminEmail = 'SYSTEM / PUBLIC';
    }

    await addDoc(collection(db, 'logs'), logData);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is offline. Please check your connectivity.");
    }
  }
}
testConnection();
