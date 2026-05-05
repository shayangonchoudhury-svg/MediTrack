import { useState } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { Plus, Pencil, Trash2, Users, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#34D399", "#FBBF24", "#60A5FA", "#F472B6", "#A78BFA", "#FB7185", "#22D3EE", "#84CC16"];
const RELATIONS = ["self", "spouse", "child", "parent", "grandparent", "sibling", "other"];

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Profiles() {
  const { profiles, refreshProfiles, activeProfileId, setActiveProfileId } = useAuth();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const onDelete = async (p) => {
    if (profiles.length === 1) {
      toast.error("You need at least one profile.");
      return;
    }
    if (!window.confirm(`Delete profile "${p.name}"? All medicines and history will be lost.`)) return;
    try {
      await api.delete(`/profiles/${p.id}`);
      toast.success("Profile deleted");
      if (activeProfileId === p.id) setActiveProfileId(null);
      await refreshProfiles();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 mb-3">Family</div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tighter text-white">Profiles</h1>
          <p className="text-base text-slate-400 mt-2">
            Track medications for everyone you care for, in one place.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          data-testid="add-profile-button"
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> New profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl text-white tracking-tight mb-1">No profiles yet</h3>
          <p className="text-sm text-slate-500">Add a profile to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map((p, idx) => (
            <div
              key={p.id}
              data-testid={`profile-card-${p.id}`}
              className={`bg-slate-900 border rounded-3xl p-6 transition-all hover:-translate-y-0.5 fade-up ${
                p.id === activeProfileId ? "border-emerald-400/40 shadow-[0_0_25px_-10px_rgba(52,211,153,0.4)]" : "border-white/5 hover:border-white/10"
              }`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-start gap-4">
                <span
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-slate-950 shrink-0"
                  style={{ background: p.color }}
                >
                  {initials(p.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl font-medium text-white tracking-tight truncate">{p.name}</h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">{p.relation}</p>
                  {p.id === activeProfileId && (
                    <span className="inline-block mt-2 text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-5 pt-5 border-t border-white/5">
                <button
                  onClick={() => setActiveProfileId(p.id)}
                  data-testid={`profile-activate-${p.id}`}
                  disabled={p.id === activeProfileId}
                  className="flex-1 h-9 rounded-full bg-white/5 hover:bg-white/10 text-xs text-slate-200 disabled:opacity-50"
                >
                  {p.id === activeProfileId ? "Active" : "Set active"}
                </button>
                <button
                  onClick={() => {
                    setEditing(p);
                    setEditorOpen(true);
                  }}
                  data-testid={`profile-edit-${p.id}`}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => onDelete(p)}
                  data-testid={`profile-delete-${p.id}`}
                  className="w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <ProfileEditor
          initial={editing}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSaved={async (newId) => {
            await refreshProfiles();
            if (newId) setActiveProfileId(newId);
            setEditorOpen(false);
            setEditing(null);
          }}
        />
      )}
    </AppShell>
  );
}

function ProfileEditor({ initial, onClose, onSaved }) {
  const [name, setName] = useState(initial?.name || "");
  const [relation, setRelation] = useState(initial?.relation || "self");
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (initial) {
        await api.put(`/profiles/${initial.id}`, { name: name.trim(), relation, color });
        toast.success("Profile updated");
        onSaved();
      } else {
        const { data } = await api.post(`/profiles`, { name: name.trim(), relation, color });
        toast.success("Profile created");
        onSaved(data.id);
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-3xl p-8" data-testid="profile-editor">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              {initial ? "Edit profile" : "New profile"}
            </div>
            <h2 className="font-display text-xl font-medium text-white tracking-tight">
              {initial ? initial.name : "Add a family member"}
            </h2>
          </div>
          <button
            onClick={onClose}
            data-testid="profile-editor-close"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="profile-name-input"
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 h-12 text-white outline-none focus:border-emerald-400/50"
              placeholder="e.g. Mom"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">Relationship</label>
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
              data-testid="profile-relation-select"
              className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 h-12 text-white capitalize outline-none focus:border-emerald-400/50"
            >
              {RELATIONS.map((r) => (
                <option key={r} value={r} className="capitalize bg-slate-900">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  data-testid={`profile-color-${c}`}
                  className={`w-9 h-9 rounded-full border-2 ${color === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="profile-form-submit"
              className="flex-1 h-12 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
              {initial ? "Save" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
