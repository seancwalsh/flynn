import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  therapistId: string | null;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [therapistId, setTherapistId] = useState<string | null>(null);

  useEffect(() => {
    // For development, auto-authenticate with a mock therapist ID
    // In production, this would integrate with Clerk
    if (import.meta.env.DEV) {
      setTimeout(() => {
        setIsAuthenticated(true);
        setTherapistId("dev-therapist-id"); // This would come from the backend /auth/me endpoint
        setIsLoading(false);
      }, 100);
    } else {
      // TODO: Integrate with Clerk for production
      setIsLoading(false);
    }
  }, []);

  const login = () => {
    setIsAuthenticated(true);
    setTherapistId("dev-therapist-id");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setTherapistId(null);
    localStorage.removeItem("clerk_token");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, therapistId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
