import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import MedicineEditor from "../components/MedicineEditor";
import { Plus, Pencil, Trash2, Pill, Clock, Calendar } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Medicines() {
  const { activeProfileId, profiles } = useAuth();
  const profile = profiles.find((p) => p.id === activeProfileId);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchMeds = useCallback(async () => {
    if (!activeProfileId) {
      setMeds([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/medicines?profile_id=${activeProfileId}`);
      setMeds(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);

  const onSubmit = async (payload) => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/medicines/${editing.id}`, payload);
        toast.success("Medicine updated");
      } else {
        await api.post(`/medicines`, payload);
        toast.success("Medicine added");
      }
      setEditorOpen(false);
      setEditing(null);
      await fetchMeds();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (m) => {
    if (!window.confirm(`Delete ${m.name}? This will remove all dose history.`)) return;
    try {
      await api.delete(`/medicines/${m.id}`);
      toast.success("Medicine deleted");
      await fetchMeds();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-10">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 mb-3">
            {profile?.name || "—"} · routine
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tighter text-white">
            Medicines
          </h1>
          <p className="text-base text-slate-400 mt-2">
            All prescriptions, dosages, and schedules in one place.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          disabled={!activeProfileId}
          data-testid="add-medicine-button"
          className="inline-flex items-center gap-2 px-5 h-11 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" strokeWidth={2} /> New medicine
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-500 text-sm">
          Loading…
        </div>
      ) : meds.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center" data-testid="medicines-empty">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mb-4">
            <Pill className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-xl text-white tracking-tight mb-1">No medicines yet</h3>
          <p className="text-sm text-slate-500 mb-6">Add your first prescription to begin tracking.</p>
          <button
            onClick={() => {
              setEditing(null);
              setEditorOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2} /> Add medicine
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {meds.map((m, idx) => (
            <div
              key={m.id}
              data-testid={`medicine-card-${m.id}`}
              className="bg-slate-900 border border-white/5 rounded-3xl p-6 hover:border-white/10 hover:-translate-y-0.5 transition-all fade-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${m.color}20`, border: `1px solid ${m.color}40` }}
                  >
                    <Pill className="w-5 h-5" style={{ color: m.color }} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-xl font-medium text-white tracking-tight truncate">
                      {m.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {m.dosage} · <span className="capitalize">{m.form}</span>
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      setEditing(m);
                      setEditorOpen(true);
                    }}
                    data-testid={`medicine-edit-${m.id}`}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => onDelete(m)}
                    data-testid={`medicine-delete-${m.id}`}
                    className="w-9 h-9 rounded-full bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-white/5 space-y-2.5">
                <div className="flex items-center gap-2 text-[13px] text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                  <span className="font-mono">{m.times.join(", ") || "No times set"}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px] text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.5} />
                  <span>
                    {m.frequency === "daily"
                      ? "Every day"
                      : (m.days_of_week || []).map((d) => DAY_NAMES[d]).join(" · ")}
                  </span>
                </div>
                {m.notes && <div className="text-xs text-slate-500 italic">"{m.notes}"</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <MedicineEditor
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setEditing(null);
        }}
        onSubmit={onSubmit}
        initial={editing}
        profileId={activeProfileId}
        saving={saving}
      />
    </AppShell>
  );
}
