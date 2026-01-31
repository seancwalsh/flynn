import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "~/lib/auth";
import { useEffect } from "react";
import { Button } from "@flynn-aac/shared-ui";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = () => {
    // For development, auto-login
    // In production, this would redirect to Clerk
    login();
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">Flynn AAC</span>
        </div>

        <h2 className="text-2xl font-bold text-center mb-6">Therapist Login</h2>

        <div className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            Sign In (Dev Mode)
          </Button>

          <p className="text-sm text-gray-600 text-center">
            Production: This will integrate with Clerk authentication
          </p>
        </div>
      </div>
    </div>
  );
}
