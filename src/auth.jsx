// auth.jsx — minimal stub. Auth is currently disabled per the
// AUTH_DISABLED_FOR_TESTING flag in App.jsx. These exports exist so the
// import in App.jsx resolves; the actual gating is bypassed because the
// flag is true. If auth needs to be re-enabled later, replace this file
// with the real implementation.

export function LoginGate({ children }) {
  return children;
}

export function HeaderUserBadge() {
  return null;
}

export function useAuth() {
  return {
    user: null,
    signedIn: false,
    signIn: () => {},
    signOut: () => {},
  };
}
