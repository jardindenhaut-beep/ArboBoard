import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  espace,
  children,
}: {
  espace: "chef" | "salarie";
  children: ReactNode;
}) {
  const auth = useAuth();

  if (auth.chargement) {
    return <main className="center"><div className="loader" /></main>;
  }

  if (!auth.profil || !auth.espace)
    return <Navigate to="/connexion" replace />;

  if (auth.espace !== espace)
    return <Navigate to={auth.espace === "chef" ? "/chef" : "/salarie"} replace />;

  return <>{children}</>;
}
