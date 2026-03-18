import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "visualizador";
}

export default function ProtectedRoute({ children, requiredRole = "admin" }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Limpeza global de possíveis bloqueios de UI ao trocar de rota
    document.body.style.overflow = "auto";
    document.body.style.pointerEvents = "auto";
    
    if (loading) return;

    if (!isAuthenticated) {
      setLocation("/login");
      return;
    }

    if (requiredRole === "admin" && user?.role !== "admin") {
      setLocation("/");
      return;
    }
  }, [loading, isAuthenticated, user, requiredRole, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-slate-400">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requiredRole === "admin" && user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
