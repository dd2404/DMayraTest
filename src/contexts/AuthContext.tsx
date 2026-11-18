import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getAdditionalUserInfo,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_OWNER_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { CustomerProfile, Locale, UserAccount, UserRole } from '../types/domain';

interface AuthContextValue {
  firebaseUser: User | null;
  account: UserAccount | null;
  customerProfile: CustomerProfile | null;
  loading: boolean;
  authBusy: boolean;
  authError: string | null;
  authNotice: string | null;
  isOffline: boolean;
  role: UserRole | null;
  isStaff: boolean;
  canManage: boolean;
  isOwner: boolean;
  clearAuthFeedback: () => void;
  signInWithGoogle: (mode?: 'signin' | 'signup') => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(error: unknown, locale: Locale): { message: string; isCancel: boolean } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      isCancel: true,
      message:
        locale === 'ms'
          ? 'Tetingkap log masuk Google ditutup sebelum selesai. Klik semula untuk mencuba lagi.'
          : 'Google sign-in popup was closed before completing. Click again whenever you are ready.',
    };
  }
  if (code === 'auth/popup-blocked') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Pelayar menyekat tetingkap timbul (popup). Sila benarkan popup untuk laman ini dan cuba semula.'
          : 'Your browser blocked the sign-in popup. Please allow popups for this site and try again.',
    };
  }
  if (code === 'auth/network-request-failed') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Tiada sambungan internet stabil. Sila semak rangkaian 4G/Wi-Fi anda dan cuba lagi.'
          : 'Network error during authentication. Please check your internet connection and retry.',
    };
  }
  if (code === 'auth/user-disabled') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Akaun ini telah dinyahaktifkan oleh pentadbir. Hubungi pemilik kedai untuk bantuan.'
          : 'This account has been disabled by the administrator. Please contact the store owner.',
    };
  }
  if (code === 'auth/too-many-requests') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Terlalu banyak percubaan log masuk. Sila tunggu beberapa minit sebelum mencuba lagi.'
          : 'Too many authentication attempts. Please wait a few minutes before retrying.',
    };
  }
  if (code === 'auth/unauthorized-domain') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Domain aplikasi belum dibenarkan di tetapan Firebase Auth.'
          : 'This domain is not authorized in Firebase Authentication settings.',
    };
  }
  if (code === 'auth/account-exists-with-different-credential') {
    return {
      isCancel: false,
      message:
        locale === 'ms'
          ? 'Emel ini telah didaftarkan dengan kaedah log masuk berbeza.'
          : 'An account already exists with this email using a different sign-in method.',
    };
  }

  const rawMsg = error instanceof Error ? error.message : String(error);
  return {
    isCancel: false,
    message:
      locale === 'ms'
        ? `Ralat pengesahan Google: ${rawMsg}`
        : `Google authentication error: ${rawMsg}`,
  };
}

export const AuthProvider: React.FC<{ locale: Locale; children: React.ReactNode }> = ({
  locale,
  children,
}) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const signInLockRef = useRef(false);

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const syncUserDocument = useCallback(
    async (user: User, isNewSignUp = false) => {
      if (!user.emailVerified || !user.email) {
        setAuthError(
          locale === 'ms'
            ? 'Akaun Google anda perlu mempunyai emel yang disahkan untuk mengakses sistem.'
            : 'Your Google account must have a verified email address to proceed.'
        );
        await firebaseSignOut(auth);
        return;
      }

      const userPath = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);
      let existingAccount: UserAccount | null = null;

      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          existingAccount = snap.data() as UserAccount;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }

      const isBootstrappedOwner =
        user.email.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase();

      if (existingAccount && existingAccount.active === false) {
        setAuthError(
          locale === 'ms'
            ? 'Akaun anda tidak aktif. Sila hubungi pentadbir D\'Mayra.'
            : 'Your account has been deactivated. Please contact D\'Mayra owner.'
        );
        await firebaseSignOut(auth);
        setAccount(null);
        return;
      }

      if (!existingAccount) {
        const assignedRole: UserRole = isBootstrappedOwner ? 'owner' : 'customer';
        const newAccount: UserAccount = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0] || 'Pengguna Google',
          photoURL: user.photoURL || null,
          role: assignedRole,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        try {
          await setDoc(userRef, newAccount);
          existingAccount = { ...newAccount, role: assignedRole };
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, userPath);
        }

        if (isNewSignUp) {
          setAuthNotice(
            locale === 'ms'
              ? `Pendaftaran akaun Google berjaya! Selamat datang, ${newAccount.displayName}.`
              : `Google account registered! Welcome, ${newAccount.displayName}.`
          );
        }
      } else {
        const desiredRole: UserRole = isBootstrappedOwner ? 'owner' : existingAccount.role;
        const safeDisplayName =
          user.displayName || existingAccount.displayName || user.email.split('@')[0];
        try {
          await setDoc(
            userRef,
            {
              uid: user.uid,
              email: user.email,
              displayName: safeDisplayName,
              photoURL: user.photoURL || null,
              role: desiredRole,
              active: existingAccount.active,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          existingAccount = {
            ...existingAccount,
            displayName: safeDisplayName,
            photoURL: user.photoURL || null,
            role: desiredRole,
          };
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, userPath);
        }
      }

      setAccount(existingAccount);

      // Sync private customer profile
      const customerPath = `customers/${user.uid}`;
      const customerRef = doc(db, 'customers', user.uid);
      try {
        const custSnap = await getDoc(customerRef);
        if (custSnap.exists()) {
          setCustomerProfile(custSnap.data() as CustomerProfile);
        } else {
          const initialCustomer: CustomerProfile = {
            uid: user.uid,
            phone: '',
            savedAddresses: [],
            marketingConsent: false,
            updatedAt: serverTimestamp(),
          };
          await setDoc(customerRef, initialCustomer);
          setCustomerProfile({ ...initialCustomer, savedAddresses: [] });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, customerPath);
      }
    },
    [locale]
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await syncUserDocument(user, false);
        } catch (err) {
          console.error('Failed to sync user account:', err);
        }
      } else {
        setAccount(null);
        setCustomerProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncUserDocument]);

  const signInWithGoogle = useCallback(
    async (mode: 'signin' | 'signup' = 'signin'): Promise<boolean> => {
      if (signInLockRef.current) return false;
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setAuthError(
          locale === 'ms'
            ? 'Anda berada di luar talian. Sambungkan internet untuk log masuk dengan Google.'
            : 'You appear to be offline. Connect to the internet to sign in with Google.'
        );
        return false;
      }

      signInLockRef.current = true;
      setAuthBusy(true);
      setAuthError(null);
      setAuthNotice(null);

      try {
        const result = await signInWithPopup(auth, googleProvider);
        const additionalInfo = getAdditionalUserInfo(result);
        const isNew = Boolean(additionalInfo?.isNewUser) || mode === 'signup';
        await syncUserDocument(result.user, isNew);
        if (!isNew) {
          setAuthNotice(
            locale === 'ms'
              ? `Berjaya log masuk sebagai ${result.user.displayName || result.user.email}.`
              : `Signed in as ${result.user.displayName || result.user.email}.`
          );
        }
        return true;
      } catch (err) {
        const mapped = mapFirebaseAuthError(err, locale);
        setAuthError(mapped.message);
        return false;
      } finally {
        signInLockRef.current = false;
        setAuthBusy(false);
      }
    },
    [locale, syncUserDocument]
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);
    await firebaseSignOut(auth);
    setAccount(null);
    setCustomerProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await syncUserDocument(firebaseUser, false);
    }
  }, [firebaseUser, syncUserDocument]);

  const clearAuthFeedback = useCallback(() => {
    setAuthError(null);
    setAuthNotice(null);
  }, []);

  const role: UserRole | null = account?.role ?? null;
  const isOwner = role === 'owner';
  const canManage = role === 'owner' || role === 'manager';
  const isStaff = role === 'owner' || role === 'manager' || role === 'helper';

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        account,
        customerProfile,
        loading,
        authBusy,
        authError,
        authNotice,
        isOffline,
        role,
        isStaff,
        canManage,
        isOwner,
        clearAuthFeedback,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
