import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Scale, CheckCircle2, FileSearch, Eye, EyeOff, Loader2, Globe, ArrowRight, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SignInPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login, signup, guestLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ReadOnly state to block aggressive browser autofill until user focuses
  const [readOnlyFields, setReadOnlyFields] = useState<Record<string, boolean>>({
    name: true,
    email: true,
    password: true,
    confirmPassword: true,
  });

  const handleFocus = (field: string) => {
    setReadOnlyFields((prev) => ({ ...prev, [field]: false }));
  };

  const handleTabSwitch = (newTab: 'signin' | 'signup') => {
    setTab(newTab);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setReadOnlyFields({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });
  };

  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const validate = (): boolean => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (tab === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return false;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        setPassword('');
        setConfirmPassword('');
        return false;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        setPassword('');
        setConfirmPassword('');
        return false;
      }
    } else {
      if (!password) {
        setError('Please enter your password.');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isLoading || isGuestLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      if (tab === 'signin') {
        await login(email.trim(), password);
      } else {
        await signup(name.trim(), email.trim(), password);
      }
      const targetRoute = from && from !== '/signin' ? from : '/';
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      // Clear password fields on failure
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestEntry = async () => {
    if (isLoading || isGuestLoading) return;
    setIsGuestLoading(true);
    setError(null);

    try {
      await guestLogin();
      const targetRoute = from && from !== '/signin' ? from : '/';
      navigate(targetRoute, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to start guest session.');
    } finally {
      setIsGuestLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-nyaya-ivory text-nyaya-text font-sans antialiased">
      {/* Left Navy Hero Panel */}
      <div className="lg:w-1/2 bg-nyaya-navy900 bg-gradient-to-br from-[#0B1F3A] via-[#14305A] to-[#0B1F3A] text-white p-6 sm:p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-nyaya-navy700 relative overflow-hidden">
        {/* Subtle Geometric Background Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="w-full h-full bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-nyaya-navy700 flex items-center justify-center text-nyaya-gold shadow-md border border-nyaya-gold/40">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif text-2xl font-bold tracking-tight text-white block">
              NyayaLens
            </span>
            <span className="text-xs text-white/70 block">
              Judicial Verification Engine
            </span>
          </div>
        </div>

        {/* Central Proposition */}
        <div className="relative z-10 my-8 sm:my-12 lg:my-0 space-y-6">
          <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold leading-tight text-white tracking-tight">
            {t('auth.headline', 'Summaries you can verify, not just trust.')}
          </h1>

          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-7 h-7 rounded-lg bg-nyaya-navy700/80 flex items-center justify-center text-nyaya-gold shrink-0 border border-nyaya-gold/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="font-medium">{t('auth.bullet1', 'Verify every summary line')}</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-7 h-7 rounded-lg bg-nyaya-navy700/80 flex items-center justify-center text-nyaya-gold shrink-0 border border-nyaya-gold/30">
                <FileSearch className="w-4 h-4" />
              </div>
              <span className="font-medium">{t('auth.bullet2', 'Audit any citation')}</span>
            </div>

            <div className="flex items-center gap-3 text-sm text-white/90">
              <div className="w-7 h-7 rounded-lg bg-nyaya-navy700/80 flex items-center justify-center text-nyaya-gold shrink-0 border border-nyaya-gold/30">
                <Scale className="w-4 h-4" />
              </div>
              <span className="font-medium">{t('auth.bullet3', 'Extract court directions')}</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="relative z-10 hidden sm:block text-xs text-white/60 border-t border-nyaya-navy700/80 pt-4 font-mono">
          Strictly grounded in verified Indian legal texts & official Gazettes.
        </div>
      </div>

      {/* Right Form Half */}
      <div className="lg:w-1/2 flex-1 flex flex-col items-center justify-center p-4 sm:p-8 lg:p-12 relative bg-nyaya-ivory min-h-[600px]">
        {/* Language Switcher in Top Right */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-nyaya-border shadow-xs">
            <Globe className="w-3.5 h-3.5 text-nyaya-muted ml-1 hidden sm:block" />
            <button
              onClick={() => handleLanguageChange('en')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                i18n.language === 'en'
                  ? 'bg-nyaya-navy900 text-white'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => handleLanguageChange('hi')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                i18n.language === 'hi'
                  ? 'bg-nyaya-navy900 text-white'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              हिन्दी
            </button>
            <button
              onClick={() => handleLanguageChange('mr')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                i18n.language === 'mr'
                  ? 'bg-nyaya-navy900 text-white'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              मराठी
            </button>
          </div>
        </div>

        {/* Centered White Card */}
        <div className="w-full max-w-[440px] bg-white rounded-card border border-nyaya-border shadow-elevated p-6 sm:p-8 space-y-6 my-auto">
          {/* Card Header */}
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl font-bold text-nyaya-navy900 tracking-tight">
              {t('auth.welcome', 'Welcome to NyayaLens')}
            </h2>
            <p className="text-xs text-nyaya-muted font-sans">
              Access verified legal intelligence for Indian courts
            </p>
          </div>

          {/* Two-Tab Switch */}
          <div className="flex items-center p-1 bg-nyaya-ivory rounded-lg border border-nyaya-border text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTabSwitch('signin')}
              className={`flex-1 py-2 text-center rounded-md transition-all ${
                tab === 'signin'
                  ? 'bg-nyaya-navy900 text-white shadow-xs'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              {t('auth.tab_signin', 'Sign in')}
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch('signup')}
              className={`flex-1 py-2 text-center rounded-md transition-all ${
                tab === 'signup'
                  ? 'bg-nyaya-navy900 text-white shadow-xs'
                  : 'text-nyaya-muted hover:text-nyaya-navy900'
              }`}
            >
              {t('auth.tab_signup', 'Create account')}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-nyaya-notSupportedBg border border-nyaya-notSupported/30 text-xs text-nyaya-notSupported font-medium animate-in fade-in">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {tab === 'signin' ? (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.email', 'Email')}
                  </label>
                  <input
                    type="email"
                    name="signin-email"
                    autoComplete="off"
                    readOnly={readOnlyFields.email}
                    onFocus={() => handleFocus('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder', 'name@example.com')}
                    disabled={isLoading || isGuestLoading}
                    className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.password', 'Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="signin-password"
                      autoComplete="new-password"
                      readOnly={readOnlyFields.password}
                      onFocus={() => handleFocus('password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      disabled={isLoading || isGuestLoading}
                      className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-nyaya-muted hover:text-nyaya-navy900"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.full_name', 'Full name')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="signup-name"
                      autoComplete="off"
                      readOnly={readOnlyFields.name}
                      onFocus={() => handleFocus('name')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.name_placeholder', 'Advocate name or title')}
                      disabled={isLoading || isGuestLoading}
                      className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
                      required
                    />
                    <User className="w-3.5 h-3.5 text-nyaya-muted absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.email', 'Email')}
                  </label>
                  <input
                    type="email"
                    name="signup-email"
                    autoComplete="off"
                    readOnly={readOnlyFields.email}
                    onFocus={() => handleFocus('email')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.email_placeholder', 'name@example.com')}
                    disabled={isLoading || isGuestLoading}
                    className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.password', 'Password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="signup-password"
                      autoComplete="new-password"
                      readOnly={readOnlyFields.password}
                      onFocus={() => handleFocus('password')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      disabled={isLoading || isGuestLoading}
                      className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-nyaya-muted hover:text-nyaya-navy900"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-nyaya-navy900">
                    {t('auth.confirm_password', 'Confirm password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="signup-confirm-password"
                      autoComplete="new-password"
                      readOnly={readOnlyFields.confirmPassword}
                      onFocus={() => handleFocus('confirmPassword')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      disabled={isLoading || isGuestLoading}
                      className="w-full px-3 py-2 text-xs bg-nyaya-ivory/40 border border-nyaya-border rounded-lg focus:outline-none focus:border-nyaya-gold pr-9"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-2.5 text-nyaya-muted hover:text-nyaya-navy900"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading || isGuestLoading}
              className="w-full py-2.5 px-4 bg-nyaya-navy900 hover:bg-nyaya-navy700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-nyaya-gold" />}
              <span>
                {tab === 'signin'
                  ? t('auth.btn_signin', 'Sign in')
                  : t('auth.btn_signup', 'Create account')}
              </span>
              {!isLoading && <ArrowRight className="w-3.5 h-3.5 text-nyaya-gold" />}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-nyaya-border w-full" />
            <span className="bg-white px-3 text-[11px] font-mono uppercase text-nyaya-muted shrink-0">
              {t('auth.or', 'or')}
            </span>
          </div>

          {/* Guest Entry */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGuestEntry}
              disabled={isLoading || isGuestLoading}
              className="w-full py-2.5 px-4 bg-nyaya-ivory hover:bg-nyaya-border/40 text-nyaya-navy900 border border-nyaya-border rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGuestLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-nyaya-gold" />}
              <span>{t('auth.btn_guest', 'Continue as guest')}</span>
            </button>
            <p className="text-[11px] text-nyaya-muted text-center leading-normal">
              {t('auth.guest_helper', 'Guests can try every feature; documents are not saved.')}
            </p>
          </div>

          {/* One-Line Card Footer */}
          <div className="pt-2 border-t border-nyaya-border/50 text-center">
            <p className="text-[10px] text-nyaya-muted leading-tight">
              {t('auth.footer_note', 'AI-assisted summaries. Verify before use. Not legal advice.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
