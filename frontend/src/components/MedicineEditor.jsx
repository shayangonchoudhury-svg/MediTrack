import { useEffect, useState } from "react";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

const FORMS = ["tablet", "capsule", "syrup", "drops", "injection", "inhaler", "patch", "other"];
const DAYS = [
  { v: 0, l: "Mon" },
  { v: 1, l: "Tue" },
  { v: 2, l: "Wed" },
  { v: 3, l: "Thu" },
  { v: 4, l: "Fri" },
  { v: 5, l: "Sat" },
  { v: 6, l: "Sun" },
];
const COLORS = ["#34D399", "#FBBF24", "#60A5FA", "#F472B6", "#A78BFA", "#FB7185"];

const empty = {
  name: "",
  dosage: "",
  form: "tablet",
  times: ["08:00"],
  frequency: "daily",
  days_of_week: [0, 1, 2, 3, 4, 5, 6],
  notes: "",
  color: "#34D399",
  start_date: "",
  end_date: "",
};

export default function MedicineEditor({ open, onClose, onSubmit, initial, profileId, saving }) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({ ...empty, ...initial });
      } else {
        setForm(empty);
      }
    }
  }, [open, initial]);

  if (!open) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addTime = () => update("times", [...form.times, "12:00"]);
  const removeTime = (i) => update("times", form.times.filter((_, idx) => idx !== i));
  const setTime = (i, v) => update("times", form.times.map((t, idx) => (idx === i ? v : t)));

  const toggleDay = (d) => {
    const set = new Set(form.days_of_week);
    if (set.has(d)) set.delete(d);
    else set.add(d);
    update("days_of_week", Array.from(set).sort());
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.dosage.trim() || form.times.length === 0) return;
    const payload = { ...form, profile_id: profileId };
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:justify-end bg-slate-950/70 backdrop-blur-md">
      <div
        className="w-full md:w-[560px] md:h-full bg-slate-950 border-l border-white/10 max-h-[92vh] md:max-h-none overflow-y-auto rounded-t-3xl md:rounded-none"
        data-testid="medicine-editor"
      >
        <div className="sticky top-0 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400">
              {initial ? "Edit medicine" : "New medicine"}
            </div>
            <h2 className="font-display text-xl font-medium text-white tracking-tight">
              {initial ? initial.name : "Add to your routine"}
            </h2>
          </div>
          <button
            onClick={onClose}
            data-testid="medicine-editor-close"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" data-testid="medicine-editor-form">
          <Field label="Medicine name">
            <input
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              data-testid="med-name-input"
              className="input"
              placeholder="e.g. Atorvastatin"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Dosage">
              <input
                required
                value={form.dosage}
                onChange={(e) => update("dosage", e.target.value)}
                data-testid="med-dosage-input"
                className="input"
                placeholder="500 mg"
              />
            </Field>
            <Field label="Form">
              <select
                value={form.form}
                onChange={(e) => update("form", e.target.value)}
                data-testid="med-form-select"
                className="input capitalize"
              >
                {FORMS.map((f) => (
                  <option key={f} value={f} className="capitalize bg-slate-900">
                    {f}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Times">
            <div className="space-y-2">
              {form.times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={(e) => setTime(i, e.target.value)}
                    data-testid={`med-time-input-${i}`}
                    className="input flex-1 font-mono"
                  />
                  {form.times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(i)}
                      data-testid={`med-time-remove-${i}`}
                      className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-rose-500/20 flex items-center justify-center text-slate-400 hover:text-rose-300"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTime}
                data-testid="med-add-time"
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add another time
              </button>
            </div>
          </Field>

          <Field label="Frequency">
            <div className="flex gap-2 mb-3">
              {[
                { v: "daily", l: "Daily" },
                { v: "weekly", l: "Specific days" },
              ].map((op) => (
                <button
                  type="button"
                  key={op.v}
                  onClick={() => update("frequency", op.v)}
                  data-testid={`med-freq-${op.v}`}
                  className={`px-4 h-10 rounded-full text-xs font-medium border transition ${
                    form.frequency === op.v
                      ? "bg-emerald-400 text-slate-950 border-emerald-400"
                      : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {op.l}
                </button>
              ))}
            </div>
            {form.frequency !== "daily" && (
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => {
                  const active = form.days_of_week.includes(d.v);
                  return (
                    <button
                      type="button"
                      key={d.v}
                      onClick={() => toggleDay(d.v)}
                      data-testid={`med-day-${d.v}`}
                      className={`w-12 h-10 rounded-full text-xs font-medium border transition ${
                        active
                          ? "bg-emerald-400 text-slate-950 border-emerald-400"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {d.l}
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <Field label="Color tag">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => update("color", c)}
                  data-testid={`med-color-${c}`}
                  className={`w-9 h-9 rounded-full border-2 transition ${
                    form.color === c ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={3}
              data-testid="med-notes-input"
              className="input resize-none"
              placeholder="Take after meals, with water..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date (opt.)">
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                data-testid="med-startdate"
                className="input font-mono"
              />
            </Field>
            <Field label="End date (opt.)">
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
                data-testid="med-enddate"
                className="input font-mono"
              />
            </Field>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
              data-testid="med-cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              data-testid="medicine-form-submit"
              className="flex-1 h-12 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />}
              {initial ? "Save changes" : "Add medicine"}
            </button>
          </div>
        </form>

        <style>{`
          .input {
            width: 100%;
            background: rgba(2, 6, 23, 0.6);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 1rem;
            padding: 0 1rem;
            height: 3rem;
            color: white;
            outline: none;
            transition: all .2s;
            font-size: .9rem;
          }
          .input:focus {
            border-color: rgba(52,211,153,.5);
            box-shadow: 0 0 0 3px rgba(52,211,153,.15);
          }
          textarea.input { padding: .75rem 1rem; height: auto; }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 mb-2 block">
        {label}
      </label>
      {children}
    </div>
  );
}
