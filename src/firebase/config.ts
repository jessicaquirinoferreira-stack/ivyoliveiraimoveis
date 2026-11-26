import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  inMemoryPersistence,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createResilientFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

function createResilientAuth(): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: [
        indexedDBLocalPersistence,
        browserLocalPersistence,
        browserSessionPersistence,
        inMemoryPersistence,
      ],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = createResilientAuth();
export const db = createResilientFirestore();
export const googleProvider = new GoogleAuthProvider();

export const PRIMARY_ADMIN_UID = 'HDHYeUap9ZUM2cJXiGzM1SDreQl2';
export const PRIMARY_ADMIN_EMAIL = 'sandrodbillo@hotmail.com';
export const BOOTSTRAPPED_ADMIN_EMAIL = 'jonasjessicalove@gmail.com';
export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'jonasjessicalove@gmail.com',
  'jonasweb2rj@gmail.com',
  'sandrodbillo@hotmail.com',
  'ivyoliveiraimoveisrj@gmail.com',
  'admin@x.com',
];

export function isBootAdminUser(
  user: { uid: string; email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  const normalizedEmail = user.email?.toLowerCase() || '';
  if (
    (user.uid === 'HDHYeUap9ZUM2cJXiGzM1SDreQl2' || user.uid === '6zWtrk2KMVaBY2kW9aGe4FjbPu13') &&
    normalizedEmail === PRIMARY_ADMIN_EMAIL
  ) {
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

function getAuthErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code?: unknown }).code || '');
  }
  return '';
}

async function withAuthNetworkRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt === 1 && typeof auth.authStateReady === 'function') {
        await auth.authStateReady().catch(() => {});
      }
      return await fn();
    } catch (err) {
      lastError = err;
      const code = getAuthErrorCode(err);
      const isRetryable =
        code === 'auth/network-request-failed' || code === 'auth/internal-error';
      if (!isRetryable || attempt >= maxAttempts) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 550));
    }
  }
  throw lastError;
}

export async function diagnoseAuthNetworkFailure(): Promise<string> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Seu dispositivo parece estar sem conexão com a internet. Reconecte e tente novamente.';
  }
  try {
    const resp = await fetch('/api/health', { cache: 'no-store' });
    if (resp.ok) {
      return 'O site está online, mas este navegador não conseguiu alcançar o servidor de login do Google/Firebase (identitytoolkit.googleapis.com). Isso costuma ser causado por extensão do Chrome, VPN, antivírus ou perfil pausado — tente novamente ou abra /admin em uma janela anônima.';
    }
  } catch {
    // Same-origin also unreachable
  }
  return 'Falha de conexão com o serviço de autenticação. Verifique sua internet ou tente abrir /admin em uma janela anônima.';
}

export async function signInWithEmailPassword(email: string, password: string) {
  return withAuthNetworkRetry(() =>
    signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password)
  );
}

export async function sendAdminPasswordReset(email: string) {
  return withAuthNetworkRetry(() =>
    sendPasswordResetEmail(auth, email.trim().toLowerCase())
  );
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
