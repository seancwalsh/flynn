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

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
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
          console.error("Failed to fetch user:", error);
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }

        setState({
          user: data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (err) {
        console.error("Auth error:", err);
        setState({ user: null, isLoading: false, isAuthenticated: false });
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
