import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useAppContext } from '../../hooks/useAuthTenant';
import { applySeoMetadata } from '../../utils/seo';

interface AdminLoginProps {
  onNavigate: (to: string) => void;
}

export function AdminLogin({ onNavigate }: AdminLoginProps) {
  const {
    tenant,
    loginWithEmailPassword,
    loginWithGoogle,
    sendPasswordReset,
    authError,
    authSubmitting,
  } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    applySeoMetadata({
      title: `Acesso Administrativo — ${tenant.brandName}`,
      description: 'Área restrita de administração do site imobiliário.',
      noIndex: true,
    });
  }, [tenant.brandName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setResetMessage(null);
    setResetError(null);
    const ok = await loginWithEmailPassword(email, password);
    if (ok) {
      onNavigate('/admin');
    }
  };

  const handlePasswordReset = async () => {
    setResetMessage(null);
    setResetError(null);
    if (!email.trim()) {
      setResetError('Informe seu e-mail administrativo acima para receber o link de redefinição.');
      return;
    }
    setResetting(true);
    try {
      await sendPasswordReset(email);
      setResetMessage('Link de redefinição de senha enviado para o seu e-mail. Verifique a caixa de entrada e o spam.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Não foi possível enviar o e-mail de redefinição.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[var(--site-bg)] text-[var(--site-text)]">
      <div className="max-w-md w-full p-8 sm:p-10 bg-[var(--site-surface)] border border-[var(--site-border)] rounded-[var(--site-radius)] space-y-7 shadow-sm">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="inline-flex items-center gap-1.5 text-xs text-[var(--site-text-muted)] hover:text-[var(--site-text)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao site público
          </button>
          {tenant.logoUrl ? (
            <div className="pt-3 pb-1">
              <img
                src={tenant.logoUrl}
                alt={tenant.brandName}
                referrerPolicy="no-referrer"
                className="h-20 w-auto object-contain bg-transparent select-none"
              />
              <h1 className="sr-only">{tenant.brandName}</h1>
            </div>
          ) : (
            <h1 className="font-editorial text-3xl font-semibold pt-2">{tenant.brandName}</h1>
          )}
          <p className="text-sm text-[var(--site-text-muted)]">
            Painel de administração e publicação em tempo real.
          </p>
        </div>

        {(authError || resetError) && (
          <div
            role="alert"
            className="p-3.5 text-xs bg-red-50 border border-red-200 text-red-800 rounded-[var(--site-radius)] leading-relaxed"
          >
            {authError || resetError}
          </div>
        )}

        {resetMessage && (
          <div
            role="status"
            className="p-3.5 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-[var(--site-radius)] leading-relaxed"
          >
            {resetMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="admin-login-email"
              className="block text-[11px] uppercase tracking-[0.14em] font-medium text-[var(--site-text-muted)]"
            >
              Login (E-mail)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--site-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-login-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sandrodbillo@hotmail.com"
                disabled={authSubmitting || resetting}
                className="w-full pl-10 pr-4 py-3 text-sm bg-[var(--site-bg)] border border-[var(--site-border)] rounded-[var(--site-radius)] focus:outline-none focus:border-[var(--site-accent)] transition-colors disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="admin-login-password"
              className="block text-[11px] uppercase tracking-[0.14em] font-medium text-[var(--site-text-muted)]"
            >
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--site-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="admin-login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                disabled={authSubmitting || resetting}
                className="w-full pl-10 pr-11 py-3 text-sm bg-[var(--site-bg)] border border-[var(--site-border)] rounded-[var(--site-radius)] focus:outline-none focus:border-[var(--site-accent)] transition-colors disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--site-text-muted)] hover:text-[var(--site-text)] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={authSubmitting || resetting || !email.trim() || !password}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 text-sm font-medium bg-[var(--site-text)] text-[var(--site-surface)] rounded-[var(--site-radius)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {authSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Autenticando e configurando ambiente...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Entrar no Painel Admin
              </>
            )}
          </button>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={authSubmitting || resetting}
              className="text-xs text-[var(--site-text-muted)] hover:text-[var(--site-text)] underline underline-offset-4 transition-colors disabled:opacity-50"
            >
              {resetting ? 'Enviando link...' : 'Esqueci minha senha'}
            </button>
            <span className="text-[11px] text-[var(--site-text-muted)]">Firebase Auth</span>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--site-border)]" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider">
              <span className="bg-[var(--site-surface)] px-3 text-[var(--site-text-muted)]">ou</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={authSubmitting || resetting}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-medium bg-[var(--site-bg)] text-[var(--site-text)] border border-[var(--site-border)] rounded-[var(--site-radius)] hover:border-[var(--site-accent)] transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.955 1.19 15.245 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
              />
            </svg>
            Entrar com Google
          </button>

          <p className="text-xs text-[var(--site-text-muted)] leading-relaxed pt-1">
            Autenticação criptografada via Firebase Authentication com provisionamento automático do ambiente administrativo.
          </p>
        </form>
      </div>
    </div>
  );
}
