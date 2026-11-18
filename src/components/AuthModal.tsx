import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, LogOut, ShieldCheck, UserCheck, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Locale } from '../types/domain';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  onNavigate?: (view: 'my-orders' | 'admin') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, locale, onNavigate }) => {
  const {
    firebaseUser,
    account,
    authBusy,
    authError,
    authNotice,
    isOffline,
    isStaff,
    clearAuthFeedback,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');

  if (!open) return null;

  const handleGoogleAuth = async (mode: 'signin' | 'signup') => {
    const ok = await signInWithGoogle(mode);
    if (ok && !isStaff) {
      // Keep open briefly or allow seamless close
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={locale === 'ms' ? 'Akaun Google' : 'Google Account'}
    >
      <div className="bakery-sheet relative w-full max-w-md rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#831843]">
              D'Mayra Layer Cake
            </p>
            <h2 className="font-display text-2xl font-bold text-[#292524] mt-1">
              {firebaseUser
                ? locale === 'ms'
                  ? 'Profil Akaun Anda'
                  : 'Your Account Profile'
                : tab === 'signin'
                ? locale === 'ms'
                  ? 'Log Masuk Akaun'
                  : 'Sign In to Account'
                : locale === 'ms'
                ? 'Daftar Akaun Baru'
                : 'Create New Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAuthFeedback();
              onClose();
            }}
            className="p-2 rounded-lg text-[#554336] hover:bg-[#F5ECEA] transition-colors"
            aria-label={locale === 'ms' ? 'Tutup' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isOffline && (
          <div className="flex items-start gap-2.5 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] p-3 text-xs text-[#92400E]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {locale === 'ms'
                ? 'Sambungan internet terputus. Pengesahan Google memerlukan sambungan aktif.'
                : 'You are currently offline. Google sign-in requires an active internet connection.'}
            </span>
          </div>
        )}

        {authError && (
          <div className="flex items-start gap-2.5 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 p-3 text-xs text-[#93000A]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        {authNotice && (
          <div className="flex items-start gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{authNotice}</span>
          </div>
        )}

        {firebaseUser && account ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5 rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4">
              {account.photoURL ? (
                <img
                  src={account.photoURL}
                  alt={account.displayName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-[#E5A93C]/40"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#831843] text-white flex items-center justify-center font-display text-lg font-bold">
                  {account.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[#292524] truncate">{account.displayName}</p>
                <p className="text-xs text-[#554336] truncate">{account.email}</p>
                <p className="text-xs text-[#831843] font-medium mt-0.5">
                  {locale === 'ms' ? 'Peranan' : 'Role'}: {account.role.toUpperCase()} ·{' '}
                  {firebaseUser.emailVerified
                    ? locale === 'ms'
                      ? 'Emel Disahkan'
                      : 'Verified Email'
                    : locale === 'ms'
                    ? 'Belum Disahkan'
                    : 'Unverified'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate?.('my-orders');
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                {locale === 'ms' ? 'Lihat Pesanan & Alamat Saya' : 'My Orders & Saved Addresses'}
              </button>

              {isStaff && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigate?.('admin');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#831843] text-white text-sm font-semibold hover:bg-[#6B1236] transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {locale === 'ms' ? 'Buka Portal Admin D\'Mayra' : 'Open D\'Mayra Admin Portal'}
                </button>
              )}

              <button
                type="button"
                onClick={() => signOut()}
                disabled={authBusy}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-[#E7DDD3] text-[#554336] text-sm font-semibold hover:bg-[#F5ECEA] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {locale === 'ms' ? 'Log Keluar' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F5ECEA]">
              <button
                type="button"
                onClick={() => {
                  clearAuthFeedback();
                  setTab('signin');
                }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'signin'
                    ? 'bg-white text-[#292524] shadow-sm'
                    : 'text-[#554336] hover:text-[#292524]'
                }`}
              >
                {locale === 'ms' ? 'Log Masuk' : 'Sign In'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAuthFeedback();
                  setTab('signup');
                }}
                className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  tab === 'signup'
                    ? 'bg-white text-[#292524] shadow-sm'
                    : 'text-[#554336] hover:text-[#292524]'
                }`}
              >
                {locale === 'ms' ? 'Daftar Akaun Baru' : 'Sign Up'}
              </button>
            </div>

            <p className="text-sm text-[#554336] leading-relaxed">
              {tab === 'signin'
                ? locale === 'ms'
                  ? 'Log masuk menggunakan Akaun Google untuk menyemak sejarah pesanan, alamat tersimpan, dan ulang tempahan pantas.'
                  : 'Sign in with your Google Account to view order history, saved Malaysian addresses, and one-tap reorder.'
                : locale === 'ms'
                ? 'Daftar akaun pelanggan baharu secara automatik menggunakan Akaun Google anda. Tiada kata laluan berasingan diperlukan.'
                : 'Register a new customer account instantly using your Google Account. No separate password required.'}
            </p>

            <button
              type="button"
              onClick={() => handleGoogleAuth(tab)}
              disabled={authBusy || isOffline}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white border border-[#DBC2B0] text-[#292524] text-sm font-semibold hover:bg-[#FAF7F2] disabled:opacity-60 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>
                {authBusy
                  ? locale === 'ms'
                    ? 'Menghubungkan ke Google...'
                    : 'Connecting to Google...'
                  : tab === 'signin'
                  ? locale === 'ms'
                    ? 'Teruskan Log Masuk dengan Google'
                    : 'Continue with Google Sign-In'
                  : locale === 'ms'
                  ? 'Daftar Akaun dengan Google'
                  : 'Sign Up with Google Account'}
              </span>
            </button>

            <p className="text-xs text-[#554336] text-center leading-relaxed">
              {locale === 'ms'
                ? 'Nota: Tempahan tetamu (tanpa log masuk) juga dibenarkan semasa checkout.'
                : 'Note: Guest checkout without signing in is also supported at checkout.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
