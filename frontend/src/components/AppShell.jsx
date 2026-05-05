import { Link, useLocation, useNavigate } from "react-router-dom";
import { Pill, LayoutGrid, BarChart3, Users, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ProfileSwitcher from "./ProfileSwitcher";

const navItems = [
  { to: "/", label: "Today", icon: LayoutGrid, testid: "nav-today" },
  { to: "/medicines", label: "Medicines", icon: Pill, testid: "nav-medicines" },
  { to: "/stats", label: "Adherence", icon: BarChart3, testid: "nav-stats" },
  { to: "/profiles", label: "Family", icon: Users, testid: "nav-profiles" },
];

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white grid-backdrop">
      <header
        className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-2xl border-b border-white/5"
        data-testid="app-header"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group" data-testid="brand-link">
            <div className="w-9 h-9 rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
              <Pill className="w-4 h-4 text-emerald-400" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-medium tracking-tight">MediTrack</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Dosage care</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-testid={item.testid}
                  className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition-all ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <ProfileSwitcher />
            <button
              onClick={async () => {
                await logout();
                navigate("/login");
              }}
              data-testid="logout-button"
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-full text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              <span className="hidden lg:inline">Sign out</span>
            </button>
          </div>
        </div>

        {/* mobile nav */}
        <nav className="md:hidden flex items-center justify-around border-t border-white/5 py-2">
          {navItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider ${
                  active ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8" data-testid="main-area">
        {children}
      </main>

      <footer className="border-t border-white/5 mt-12 py-6 text-center text-xs text-slate-600">
        Signed in as <span className="text-slate-400">{user?.email}</span> · MediTrack v1
      </footer>
    </div>
  );
}
