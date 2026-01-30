import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AuthProvider } from "~/lib/auth";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}
