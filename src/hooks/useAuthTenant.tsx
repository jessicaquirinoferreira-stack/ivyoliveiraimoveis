import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  changeAdminPassword,
  diagnoseAuthNetworkFailure,
  isBootAdminUser,
  sendAdminPasswordReset,
  signInWithEmailPassword,
  signInWithGoogle,
  signOutFirebase,
  testFirestoreConnection,
} from '../firebase/config';
import { bootstrapUserAndTenant, subscribePublicTenant } from '../firebase/firestoreService';
import { DEFAULT_TENANT, DEFAULT_TENANT_ID } from '../config/defaultTenant';
import { applyThemeToDocument } from '../config/themes';
import { Tenant, UserProfile } from '../types/realestate';
import { injectAnalyticsScripts } from '../utils/seo';

interface AppContextValue {
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  authSubmitting: boolean;
  tenant: Tenant;
  activeTenantId: string;
  setActiveTenantId: (id: string) => void;
  firestoreConnected: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AppContext = createContext<AppContextValue | null>(null);

function getAuthCode(err: unknown): string {
  return typeof err === 'object' && err !== null && 'code' in err
    ? String((err as { code?: unknown }).code || '')
    : '';
}

function mapFirebaseAuthError(err: unknown): string {
  const code = getAuthCode(err);
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.';
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/weak-password':
      return 'A nova senha deve ter no mínimo 6 caracteres.';
    case 'auth/requires-recent-login':
      return 'Por segurança, confirme sua senha atual ou faça login novamente antes de alterar a senha.';
    case 'auth/user-disabled':
      return 'Esta conta administrativa está desativada no Firebase Authentication.';
    case 'auth/operation-not-allowed':
      return 'O método de login por E-mail/Senha precisa estar ativado no Firebase Authentication.';
    case 'auth/unauthorized-domain':
      return 'O login com Google exige autorizar este domínio no Firebase Console (Authentication → Settings → Authorized domains). Utilize o login por E-mail e Senha acima, que funciona imediatamente em qualquer domínio Vercel.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Janela de login do Google fechada antes da conclusão. Tente novamente ou entre com E-mail e Senha.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou o pop-up do Google. Libere pop-ups para este site ou entre com E-mail e Senha.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes e tente novamente.';
    case 'auth/network-request-failed':
      return 'Falha de conexão com o serviço de autenticação. Verifique sua internet ou tente abrir em uma janela anônima.';
    default:
      return err instanceof Error ? err.message : 'Não foi possível autenticar no painel administrativo.';
  }
}

function formatBootstrapError(err: unknown): string {
  if (err instanceof Error) {
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed.error && parsed.error.toLowerCase().includes('permission')) {
        return 'Permissão insuficiente no Firestore para inicializar esta conta administrativa. Verifique se o e-mail autorizado corresponde às regras publicadas.';
      }
      if (parsed.error) return parsed.error;
    } catch {
      if (err.message) return err.message;
    }
  }
  return 'Não foi possível inicializar o ambiente administrativo no Firestore. Tente novamente.';
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string>(DEFAULT_TENANT_ID);
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT);
  const [firestoreConnected, setFirestoreConnected] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const authSeqRef = useRef(0);
  const inFlightHydrationRef = useRef<{ uid: string; promise: Promise<boolean> } | null>(null);

  useEffect(() => {
    testFirestoreConnection().then(setFirestoreConnected);
  }, []);

  const hydrateSession = useCallback(async (firebaseUser: User | null): Promise<boolean> => {
    if (!firebaseUser) {
      inFlightHydrationRef.current = null;
      const seq = ++authSeqRef.current;
      setAuthError(null);
      setUser(null);
      setProfile(null);
      setIsAdmin(false);
      setActiveTenantId(DEFAULT_TENANT_ID);
      if (seq === authSeqRef.current) {
        setAuthReady(true);
      }
      return false;
    }

    // Deduplicate concurrent calls from onAuthStateChanged + loginWithEmailPassword/loginWithGoogle
    if (inFlightHydrationRef.current && inFlightHydrationRef.current.uid === firebaseUser.uid) {
      return inFlightHydrationRef.current.promise;
    }

    const seq = ++authSeqRef.current;
    setAuthError(null);

    const run = (async (): Promise<boolean> => {
      try {
        let boot;
        try {
          boot = await bootstrapUserAndTenant(firebaseUser);
        } catch (firstErr) {
          // Force-refresh Firebase ID token once in case token claims were stale
          await firebaseUser.getIdToken(true).catch(() => {});
          try {
            boot = await bootstrapUserAndTenant(firebaseUser);
          } catch (secondErr) {
            // Never lock out a verified bootstrapped platform admin on transient network errors
            if (isBootAdminUser(firebaseUser)) {
              console.warn('Boot admin fallback hydration after transient error:', secondErr);
              boot = {
                profile: {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email?.toLowerCase() || 'sandrodbillo@hotmail.com',
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Administrador',
                  photoURL: firebaseUser.photoURL || '',
                  role: 'admin' as const,
                  tenantId: DEFAULT_TENANT_ID,
                },
                tenant: DEFAULT_TENANT,
                isAdmin: true,
              };
            } else {
              throw firstErr;
            }
          }
        }

        if (seq !== authSeqRef.current) return false;
        setProfile(boot.profile);
        setIsAdmin(boot.isAdmin);
        setActiveTenantId(boot.profile.tenantId);
        setTenant(boot.tenant);
        setUser(firebaseUser);
        setAuthReady(true);
        return true;
      } catch (err) {
        if (seq !== authSeqRef.current) return false;
        console.error('Bootstrap error:', err);
        setProfile(null);
        setIsAdmin(false);
        setUser(null);
        setAuthError(formatBootstrapError(err));
        setAuthReady(true);
        return false;
      } finally {
        if (inFlightHydrationRef.current?.uid === firebaseUser.uid) {
          inFlightHydrationRef.current = null;
        }
      }
    })();

    inFlightHydrationRef.current = { uid: firebaseUser.uid, promise: run };
    return run;
  }, []);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      await hydrateSession(firebaseUser);
    });
    return () => unsubAuth();
  }, [hydrateSession]);

  useEffect(() => {
    const unsubTenant = subscribePublicTenant(activeTenantId, (loadedTenant) => {
      setTenant(loadedTenant);
      if (loadedTenant.themeConfig) {
        applyThemeToDocument(loadedTenant.themeConfig);
      }
      const nextFavicon = loadedTenant.faviconUrl || loadedTenant.logoUrl || '/logo-ivy-oliveira.png';
      let iconEl = document.head.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (!iconEl) {
        iconEl = document.createElement('link');
        iconEl.rel = 'icon';
        document.head.appendChild(iconEl);
      }
      if (iconEl.getAttribute('href') !== nextFavicon) {
        iconEl.href = nextFavicon;
      }
      if (loadedTenant.gscVerification) {
        let gscEl = document.head.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
        if (!gscEl) {
          gscEl = document.createElement('meta');
          gscEl.name = 'google-site-verification';
          document.head.appendChild(gscEl);
        }
        gscEl.content = loadedTenant.gscVerification;
      }
      injectAnalyticsScripts(loadedTenant.ga4Id, loadedTenant.gtmId);
    });
    return () => unsubTenant();
  }, [activeTenantId]);

  const loginWithEmailPassword = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const cred = await signInWithEmailPassword(email, password);
      return await hydrateSession(cred.user);
    } catch (err) {
      if (getAuthCode(err) === 'auth/network-request-failed') {
        const diagnostic = await diagnoseAuthNetworkFailure();
        setAuthError(diagnostic);
      } else {
        setAuthError(mapFirebaseAuthError(err));
      }
      return false;
    } finally {
      setAuthSubmitting(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<void> => {
    try {
      await sendAdminPasswordReset(email);
    } catch (err) {
      if (getAuthCode(err) === 'auth/network-request-failed') {
        throw new Error(await diagnoseAuthNetworkFailure());
      }
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    try {
      await changeAdminPassword(currentPassword, newPassword);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    setAuthSubmitting(true);
    try {
      const cred = await signInWithGoogle();
      await hydrateSession(cred.user);
    } catch (err) {
      if (getAuthCode(err) === 'auth/network-request-failed') {
        const diagnostic = await diagnoseAuthNetworkFailure();
        setAuthError(diagnostic);
      } else {
        setAuthError(mapFirebaseAuthError(err));
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const logout = async () => {
    inFlightHydrationRef.current = null;
    await signOutFirebase();
    setActiveTenantId(DEFAULT_TENANT_ID);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        authReady,
        authSubmitting,
        tenant,
        activeTenantId,
        setActiveTenantId,
        firestoreConnected,
        loginWithEmailPassword,
        sendPasswordReset,
        updateUserPassword,
        loginWithGoogle,
        logout,
        authError,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
  return ctx;
}
