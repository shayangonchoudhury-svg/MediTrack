import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import ScheduleItem from "../components/ScheduleItem";
import { Flame, Activity, Calendar, Pill, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function readableDate() {
  const d = new Date();
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export default function Dashboard() {
  const { user, activeProfileId, profiles } = useAuth();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [schedule, setSchedule] = useState({ items: [] });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!activeProfileId) {
      setSchedule({ items: [] });
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.get(`/schedule?profile_id=${activeProfileId}`),
        api.get(`/stats?profile_id=${activeProfileId}&days=7`),
      ]);
      setSchedule(s.data);
      setStats(t.data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [activeProfileId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const markStatus = async (item, status) => {
    try {
      await api.post(`/schedule/status`, {
        medicine_id: item.medicine_id,
        profile_id: activeProfileId,
        scheduled_time: item.scheduled_time,
        date: schedule.date || todayStr(),
        status,
      });
      const labels = { taken: "Marked as taken", skipped: "Marked as skipped", pending: "Reverted" };
      toast.success(labels[status] || "Updated");
      await fetchAll();
    } catch (e) {
      toast.error(formatApiError(e));
    }
  };

  const taken = schedule.items.filter((i) => i.status === "taken").length;
  const totalToday = schedule.items.length;
  const adherenceToday = totalToday > 0 ? Math.round((taken / totalToday) * 100) : 0;
  const pending = schedule.items.filter((i) => i.status === "pending");
  const upcoming = pending[0];

  return (
    <AppShell>
      <div className="mb-10">
        <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 mb-3">
          {readableDate()}
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tighter text-white mb-2">
          Hello, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="text-base text-slate-400">
          {activeProfile
            ? `Showing schedule for ${activeProfile.name}.`
            : "Add a profile to begin tracking."}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatCard
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          label="Today's adherence"
          value={`${adherenceToday}%`}
          sub={`${taken} of ${totalToday} doses taken`}
          accent="emerald"
          testid="stat-adherence-today"
        />
        <StatCard
          icon={<Flame className="w-4 h-4" strokeWidth={1.5} />}
          label="Current streak"
          value={stats ? `${stats.current_streak}` : "0"}
          sub={stats?.current_streak === 1 ? "perfect day" : "perfect days in a row"}
          accent="amber"
          testid="stat-streak"
        />
        <StatCard
          icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
          label="7-day adherence"
          value={stats ? `${stats.overall_adherence}%` : "—"}
          sub={stats ? `${stats.total_taken}/${stats.total_scheduled} doses` : ""}
          accent="emerald"
          testid="stat-adherence-7d"
        />
      </div>

      {/* Upcoming highlight */}
      {upcoming && (
        <div
          className="rounded-3xl bg-gradient-to-br from-emerald-400/10 to-transparent border border-emerald-400/20 p-6 lg:p-8 mb-10 flex flex-col md:flex-row md:items-center gap-6"
          data-testid="upcoming-banner"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-950/50 border border-emerald-400/30 flex items-center justify-center font-mono text-emerald-300 text-base font-bold">
            {upcoming.scheduled_time}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 mb-1">Up next</div>
            <h2 className="font-display text-2xl font-medium text-white tracking-tight">
              {upcoming.medicine_name}
            </h2>
            <p className="text-sm text-slate-400">
              {upcoming.dosage} · {upcoming.form}
            </p>
          </div>
          <button
            onClick={() => markStatus(upcoming, "taken")}
            data-testid="upcoming-take-now"
            className="px-6 h-11 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm flex items-center gap-2"
          >
            Take now <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Schedule */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 mb-1">Schedule</div>
          <h2 className="font-display text-2xl font-medium text-white tracking-tight">
            Today's medicine timeline
          </h2>
        </div>
        <Link
          to="/medicines"
          data-testid="dashboard-manage-medicines"
          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
        >
          Manage medicines <ArrowRight className="w-3 h-3" strokeWidth={2} />
        </Link>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-white/5 bg-slate-900/40 p-12 text-center text-slate-500 text-sm">
          Loading schedule…
        </div>
      ) : schedule.items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {schedule.items.map((item, idx) => (
            <ScheduleItem
              key={`${item.medicine_id}-${item.scheduled_time}`}
              item={item}
              index={idx}
              onMark={(status) => markStatus(item, status)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function StatCard({ icon, label, value, sub, accent, testid }) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  };
  return (
    <div
      data-testid={testid}
      className="bg-slate-900 border border-white/5 rounded-3xl p-6 lg:p-8 hover:border-white/10 hover:-translate-y-1 transition-all duration-300"
    >
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] ${colorMap[accent]}`}>
        {icon}
        <span className="uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-6 font-display text-5xl font-light tracking-tighter text-white">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{sub}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-white/10 bg-slate-900/40 p-12 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mb-4">
        <Pill className="w-6 h-6 text-emerald-400" strokeWidth={1.5} />
      </div>
      <h3 className="font-display text-xl text-white tracking-tight mb-1">Nothing scheduled today</h3>
      <p className="text-sm text-slate-500 mb-6">Add medicines and time slots to start tracking adherence.</p>
      <Link
        to="/medicines"
        data-testid="empty-add-medicine"
        className="inline-flex items-center gap-2 px-5 h-10 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-semibold text-sm"
      >
        Add a medicine <ArrowRight className="w-4 h-4" strokeWidth={2} />
      </Link>
    </div>
  );
}
