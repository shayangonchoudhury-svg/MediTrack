import { Check, X, Clock, RotateCcw } from "lucide-react";

export default function ScheduleItem({ item, onMark, index = 0 }) {
  const taken = item.status === "taken";
  const skipped = item.status === "skipped";
  const pending = item.status === "pending";

  return (
    <div
      data-testid={`schedule-item-${item.medicine_id}-${item.scheduled_time}`}
      className={`relative bg-slate-900 rounded-3xl p-5 lg:p-6 transition-all fade-up ${
        pending
          ? "border border-emerald-400/20 shadow-[0_0_20px_-8px_rgba(16,185,129,0.4)]"
          : taken
          ? "border border-emerald-400/30 opacity-90"
          : "border border-amber-400/30 opacity-80"
      }`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center pt-1">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-bold font-mono text-slate-950"
            style={{ background: item.color || "#34D399" }}
          >
            {item.scheduled_time}
          </div>
          {pending && <div className="mt-3 w-2 h-2 rounded-full bg-emerald-400 pulse-ring" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} /> {item.scheduled_time}
            <span className="text-slate-700">·</span>
            <span className="capitalize">{item.form}</span>
          </div>
          <h3 className="font-display text-xl font-medium text-white tracking-tight truncate">
            {item.medicine_name}
          </h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {item.dosage}
            {item.notes && <span className="text-slate-600"> · {item.notes}</span>}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          {pending && (
            <>
              <button
                onClick={() => onMark("taken")}
                data-testid={`mark-taken-${item.medicine_id}-${item.scheduled_time}`}
                className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-semibold transition-all"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Taken
              </button>
              <button
                onClick={() => onMark("skipped")}
                data-testid={`mark-skipped-${item.medicine_id}-${item.scheduled_time}`}
                className="flex items-center gap-1.5 px-4 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-all border border-white/10"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} /> Skip
              </button>
            </>
          )}
          {!pending && (
            <>
              <span
                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] font-semibold ${
                  taken
                    ? "bg-emerald-400/15 text-emerald-300 border border-emerald-400/30"
                    : "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                }`}
              >
                {taken ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {taken ? "Taken" : "Skipped"}
              </span>
              <button
                onClick={() => onMark("pending")}
                data-testid={`mark-undo-${item.medicine_id}-${item.scheduled_time}`}
                className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[11px] text-slate-500 hover:text-slate-300 transition"
              >
                <RotateCcw className="w-3 h-3" strokeWidth={1.5} /> Undo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
