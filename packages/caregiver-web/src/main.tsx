import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/clerk-react";
import { AuthProvider } from "~/lib/auth";
import { routeTree } from "./routeTree.gen";
import "./index.css";

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const hasClerkKey = Boolean(CLERK_PUBLISHABLE_KEY);

if (!hasClerkKey) {
  console.warn(
    "Missing VITE_CLERK_PUBLISHABLE_KEY - Running without authentication. " +
      "Copy .env.example to .env and add your Clerk key for full functionality."
  );
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Create a router instance
const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Wrapper component that conditionally includes Clerk
function AppWithProviders() {
  const content = (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );

  if (hasClerkKey) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!}>
        {content}
      </ClerkProvider>
    );
  }

  return content;
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AppWithProviders />
    </React.StrictMode>
  );
}
