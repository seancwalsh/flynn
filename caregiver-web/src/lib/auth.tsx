/**
 * Auth Context and Hooks using Clerk
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { authApi, type AuthUser } from "./api";

// Check if Clerk is configured
const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Alias for signOut
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Internal provider that uses Clerk hooks (only used when Clerk is configured)
function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, signOut: clerkSignOut, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Fetch user from our backend when Clerk auth state changes
  useEffect(() => {
    const fetchBackendUser = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      // Get token from Clerk and fetch our backend user
      try {
        const token = await getToken();
        if (token) {
          // Store token for API calls
          localStorage.setItem("clerkToken", token);
        }

        const { data, error } = await authApi.me();
        if (error || !data) {
          console.error("Failed to fetch user from backend:", error);
          // Still consider authenticated via Clerk, just without backend user data
          setState({ user: null, isLoading: false, isAuthenticated: true });
          return;
        }

        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (err) {
        console.error("Auth error:", err);
        // Still consider authenticated via Clerk, just without backend user data
        setState({ user: null, isLoading: false, isAuthenticated: true });
      }
    };

    fetchBackendUser();
  }, [isLoaded, isSignedIn, clerkUser, getToken]);

  const signOut = useCallback(async () => {
    localStorage.removeItem("clerkToken");
    await clerkSignOut();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, [clerkSignOut]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signOut,
        logout: signOut, // Alias
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Mock provider for when Clerk is not configured
function MockAuthProvider({ children }: { children: ReactNode }) {
  const noOp = async () => {
    // No-op when Clerk is not configured
  };
  const value: AuthContextValue = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    signOut: noOp,
    logout: noOp,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!hasClerkKey) {
    return <MockAuthProvider>{children}</MockAuthProvider>;
  }
  return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
