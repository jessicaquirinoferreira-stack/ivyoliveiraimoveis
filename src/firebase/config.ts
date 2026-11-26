import { initializeApp } from 'firebase/app';
import {
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type User,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const PRIMARY_ADMIN_UID = 'HDHYeUap9ZUM2cJXiGzM1SDreQl2';
export const PRIMARY_ADMIN_EMAIL = 'sandrodbillo@hotmail.com';
export const BOOTSTRAPPED_ADMIN_EMAIL = 'jonasjessicalove@gmail.com';
export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'jonasjessicalove@gmail.com',
  'jonasweb2rj@gmail.com',
  'sandrodbillo@hotmail.com',
  'admin@x.com',
];

export function isBootAdminUser(
  user: { uid: string; email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  const normalizedEmail = user.email?.toLowerCase() || '';
  if ((user.uid === 'HDHYeUap9ZUM2cJXiGzM1SDreQl2' || user.uid === '6zWtrk2KMVaBY2kW9aGe4FjbPu13') && normalizedEmail === PRIMARY_ADMIN_EMAIL) {
    return true;
  }
  return Boolean(BOOTSTRAPPED_ADMIN_EMAILS.includes(normalizedEmail));
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function sendAdminPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function sendAdminEmailVerification(user: User) {
  return sendEmailVerification(user);
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('Usuário não autenticado.');
  }
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutFirebase() {
  return signOut(auth);
}
