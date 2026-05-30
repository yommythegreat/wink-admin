import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

// Root redirects to admin login — the login page handles the already-authenticated case.
export const Route = createFileRoute("/")({
  component: RedirectToAdmin,
});

function RedirectToAdmin() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate({ to: "/admin/login" });
  }, [navigate]);

  return null;
}
