import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ChevronDown, UserPlus, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function ProfileSwitcher() {
  const { profiles, activeProfileId, setActiveProfileId } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const active = profiles.find((p) => p.id === activeProfileId) || profiles[0];

  if (!active) {
    return (
      <button
        onClick={() => navigate("/profiles")}
        data-testid="profile-add-empty"
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-400 text-slate-950 text-xs font-medium"
      >
        <UserPlus className="w-3.5 h-3.5" strokeWidth={2} /> Add profile
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        data-testid="profile-switcher-dropdown"
        className="flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-slate-950"
          style={{ background: active.color || "#34D399" }}
        >
          {initials(active.name)}
        </span>
        <span className="text-sm text-white max-w-[100px] truncate">{active.name}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 p-2 shadow-2xl">
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
              Profiles
            </div>
            {profiles.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProfileId(p.id);
                  setOpen(false);
                }}
                data-testid={`profile-option-${p.id}`}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-left"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-slate-950"
                  style={{ background: p.color || "#34D399" }}
                >
                  {initials(p.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-slate-500 capitalize">{p.relation || "self"}</div>
                </div>
                {p.id === activeProfileId && (
                  <Check className="w-4 h-4 text-emerald-400" strokeWidth={2} />
                )}
              </button>
            ))}
            <div className="my-1 h-px bg-white/5" />
            <button
              onClick={() => {
                setOpen(false);
                navigate("/profiles");
              }}
              data-testid="profile-manage-button"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-left text-sm text-emerald-400"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} /> Manage profiles
            </button>
          </div>
        </>
      )}
    </div>
  );
}
