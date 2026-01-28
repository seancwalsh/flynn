import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignIn, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

const hasClerkKey = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  // Show auth not configured message when Clerk is not set up
  if (!hasClerkKey) {
    return <AuthNotConfigured />;
  }

  return <ClerkLoginPage />;
}

function ClerkLoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const navigate = useNavigate();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoaded, isSignedIn, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
      <div className="w-full max-w-md">
        <LoginHeader />

        {/* Clerk SignIn Component */}
        <div className="flex justify-center">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/register"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0",
              },
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function LoginHeader() {
  return (
    <div className="text-center mb-8">
      <Link to="/" className="inline-flex items-center gap-2">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <span className="text-2xl font-semibold text-gray-900">Flynn AAC</span>
      </Link>
    </div>
  );
}

function AuthNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4">
      <div className="w-full max-w-md text-center">
        <LoginHeader />
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-2">
            Authentication Not Configured
          </h2>
          <p className="text-amber-700 text-sm mb-4">
            To enable login, add your Clerk publishable key to the environment
            variables.
          </p>
          <code className="block bg-amber-100 rounded p-2 text-xs text-amber-900">
            VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
          </code>
        </div>
        <Link
          to="/"
          className="mt-6 inline-block text-primary-600 hover:text-primary-700 font-medium"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
