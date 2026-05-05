import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Pill } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-400">
          <Pill className="w-5 h-5 text-emerald-400 animate-pulse" strokeWidth={1.5} />
          <span className="font-display tracking-wide text-sm uppercase">Loading</span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}
