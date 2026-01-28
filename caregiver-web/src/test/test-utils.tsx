/**
 * Test utilities for rendering components with required providers
 */

import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactElement, type ReactNode, createContext, useContext } from "react";
import type { AuthUser } from "~/lib/api";

// =============================================================================
// MOCK AUTH CONTEXT
// =============================================================================

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authError: string | null;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
}

const MockAuthContext = createContext<AuthContextValue | null>(null);

export interface MockAuthProviderProps {
  children: ReactNode;
  user?: AuthUser | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
  authError?: string | null;
}

/**
 * Mock auth provider for testing
 */
export function MockAuthProvider({
  children,
  user = null,
  isLoading = false,
  isAuthenticated = false,
  authError = null,
}: MockAuthProviderProps) {
  const signOut = async () => {
    // No-op for tests
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated,
    authError,
    signOut,
    logout: signOut,
  };

  return (
    <MockAuthContext.Provider value={value}>{children}</MockAuthContext.Provider>
  );
}

/**
 * Hook to use mock auth context in tests
 */
export function useMockAuth() {
  const context = useContext(MockAuthContext);
  if (!context) {
    throw new Error("useMockAuth must be used within a MockAuthProvider");
  }
  return context;
}

// =============================================================================
// RENDER WITH PROVIDERS
// =============================================================================

interface ProvidersProps {
  children: ReactNode;
  authProps?: Omit<MockAuthProviderProps, "children">;
}

/**
 * Default query client for tests with disabled retries
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * All providers wrapper for tests
 */
function AllProviders({ children, authProps }: ProvidersProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <MockAuthProvider {...authProps}>{children}</MockAuthProvider>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  authProps?: Omit<MockAuthProviderProps, "children">;
}

/**
 * Custom render function that wraps components with all required providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { authProps, ...renderOptions } = options;

  return render(ui, {
    wrapper: ({ children }) => (
      <AllProviders authProps={authProps}>{children}</AllProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { renderWithProviders as render };
