import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Pill, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BG = "https://images.unsplash.com/photo-1761078739436-ccee01f3d89c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxkYXJrJTIwYWJzdHJhY3QlMjB0ZXh0dXJlfGVufDB8fHx8MTc3Nzk4ODU4MXww&ixlib=rb-4.1.0&q=85";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user !== false) navigate("/");
  }, [user, navigate]);

  if (user && user !== false) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (res.ok) {
      toast.success("Welcome back");
      navigate("/");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden grid-backdrop">
      <div
        className="absolute inset-0 opacity-40"
        style={{ backgroundImage: `url(${BG})`, backgroundSize: "cover", backgroundPosition: "center" }}
      />
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Pill className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-medium tracking-tight text-white">MediTrack</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Dosage care</span>
            </div>
          </div>

          <div
            className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 lg:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.5)] fade-up"
            data-testid="login-card"
          >
            <div className="mb-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-3">Welcome back</div>
              <h1 className="font-display text-3xl font-light tracking-tighter text-white mb-2">
                Sign in to your routine
              </h1>
              <p className="text-sm text-slate-500">
                Track every dose. Build streaks. Care for your family.
              </p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
              <div>
                <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  data-testid="login-email-input"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 h-12 text-white placeholder:text-slate-600 outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">
                  Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  data-testid="login-password-input"
                  className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-4 h-12 text-white placeholder:text-slate-600 outline-none focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20 transition"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                data-testid="login-submit-button"
                className="w-full h-12 rounded-full bg-emerald-400 text-slate-950 font-semibold hover:bg-emerald-300 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
                Sign in
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-500">
              New to MediTrack?{" "}
              <Link to="/register" className="text-emerald-400 hover:underline" data-testid="login-go-register">
                Create an account
              </Link>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-600 mt-6">
            Demo: admin@meditrack.app / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
