import { useEffect, useState, useCallback } from "react";
import AppShell from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Activity, Flame, Target, Calendar } from "lucide-react";
import { toast } from "sonner";

const RANGES = [
  { v: 7, l: "7 days" },
  { v: 14, l: "14 days" },
  { v: 30, l: "30 days" },
];

export default function Stats() {
  const { activeProfileId, profiles } = useAuth();
  const profile = profiles.find((p) => p.id === activeProfileId);
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!activeProfileId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/stats?profile_id=${activeProfileId}&days=${days}`);
      setStats(data);
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }, [activeProfileId, days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const chartData = (stats?.daily || []).map((d) => ({
    day: d.date.slice(5),
    Adherence: d.adherence,
    Taken: d.taken,
    Skipped: d.skipped,
  }));

  return (
    <AppShell>
      <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-emerald-400 mb-3">
            {profile?.name || "—"}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-light tracking-tighter text-white">
            Adherence
          </h1>
          <p className="text-base text-slate-400 mt-2">
            See how consistently you're sticking to your routine.
          </p>
        </div>
        <div className="flex gap-2" data-testid="stats-range-selector">
          {RANGES.map((r) => (
            <button
              key={r.v}
              onClick={() => setDays(r.v)}
              data-testid={`stats-range-${r.v}`}
              className={`px-4 h-10 rounded-full text-xs font-medium border transition ${
                days === r.v
                  ? "bg-emerald-400 text-slate-950 border-emerald-400"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              {r.l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <BigStat
          icon={<Activity className="w-4 h-4" strokeWidth={1.5} />}
          label="Overall"
          value={stats ? `${stats.overall_adherence}%` : "—"}
          accent="emerald"
          testid="big-stat-overall"
        />
        <BigStat
          icon={<Flame className="w-4 h-4" strokeWidth={1.5} />}
          label="Streak"
          value={stats?.current_streak ?? "—"}
          sub="days"
          accent="amber"
          testid="big-stat-streak"
        />
        <BigStat
          icon={<Target className="w-4 h-4" strokeWidth={1.5} />}
          label="Doses taken"
          value={stats?.total_taken ?? "—"}
          accent="emerald"
          testid="big-stat-taken"
        />
        <BigStat
          icon={<Calendar className="w-4 h-4" strokeWidth={1.5} />}
          label="Scheduled"
          value={stats?.total_scheduled ?? "—"}
          accent="slate"
          testid="big-stat-scheduled"
        />
      </div>

      <div
        className="bg-slate-900 border border-white/5 rounded-3xl p-6 lg:p-8"
        data-testid="adherence-chart-card"
      >
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-1">Daily breakdown</div>
          <h2 className="font-display text-2xl font-medium text-white tracking-tight">
            {days}-day adherence
          </h2>
        </div>
        {loading ? (
          <div className="h-72 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-slate-500 text-sm">
            No data yet — add medicines and start tracking.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  cursor={{ fill: "rgba(52,211,153,0.05)" }}
                  contentStyle={{
                    background: "rgba(2,6,23,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 12,
                    color: "white",
                    fontFamily: "Manrope",
                    fontSize: 12,
                  }}
                  formatter={(value, name) => (name === "Adherence" ? `${value}%` : value)}
                />
                <Bar dataKey="Adherence" fill="#34d399" radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function BigStat({ icon, label, value, sub, accent, testid }) {
  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    slate: "text-slate-400 bg-white/5 border-white/10",
  };
  return (
    <div
      data-testid={testid}
      className="bg-slate-900 border border-white/5 rounded-3xl p-5 hover:border-white/10 transition-all"
    >
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] ${colorMap[accent]}`}>
        {icon}
        <span className="uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-4 font-display text-3xl lg:text-4xl font-light tracking-tighter text-white">
        {value}
        {sub && <span className="text-base text-slate-500 ml-1">{sub}</span>}
      </div>
    </div>
  );
}
