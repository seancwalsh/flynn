import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SignUp, useAuth } from "@clerk/clerk-react";
import { useEffect } from "react";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
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
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <span className="text-2xl font-semibold text-gray-900">Flynn AAC</span>
          </Link>
        </div>

        {/* Clerk SignUp Component */}
        <div className="flex justify-center">
          <SignUp
            routing="path"
            path="/register"
            signInUrl="/login"
            afterSignUpUrl="/dashboard"
            unsafeMetadata={{ role: "caregiver" }}
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0",
              },
            }}
          />
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
