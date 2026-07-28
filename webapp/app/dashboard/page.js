'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, Clock, CheckCircle2, Users, AlertCircle, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { STATUS_COLORS, VENUES } from '../../lib/constants';

function StatCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <div className="font-display text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase.from('bookings').select('*').then(({ data }) => {
      setBookings(data || []);
      setLoading(false);
    });
  }, [profile]);

  const stats = useMemo(() => {
    const s = { Tentative: 0, 'Deposit Pending': 0, Confirmed: 0, Completed: 0, 'Not Interested': 0, Cancelled: 0 };
    let students = 0, pendingFollowUps = 0;
    const today = new Date().toISOString().slice(0, 10);
    bookings.forEach((b) => {
      s[b.booking_status] = (s[b.booking_status] || 0) + 1;
      if (b.booking_status === 'Confirmed' || b.booking_status === 'Completed') students += parseFloat(b.number_of_students) || 0;
      if ((b.booking_status === 'Tentative' || b.booking_status === 'Deposit Pending') && b.follow_up_date && b.follow_up_date <= today) pendingFollowUps++;
    });
    return { s, students, pendingFollowUps, total: bookings.length };
  }, [bookings]);

  const pieData = Object.entries(stats.s).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const venueBarData = VENUES.map((v) => ({
    venue: v,
    Tentative: bookings.filter((b) => b.venue === v && b.booking_status === 'Tentative').length,
    Confirmed: bookings.filter((b) => b.venue === v && (b.booking_status === 'Confirmed' || b.booking_status === 'Completed')).length,
  }));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings
    .filter((b) => (b.booking_status === 'Tentative' || b.booking_status === 'Deposit Pending') && b.follow_up_date && b.follow_up_date <= today)
    .sort((a, b) => a.follow_up_date.localeCompare(b.follow_up_date))
    .slice(0, 6);

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="font-display text-xl font-bold text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Playo &amp; Oh Chateau school events</p>
      </header>
      <div className="p-8">
        {loading ? (
          <div className="text-sm text-slate-400 py-24 text-center">Loading…</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Total Bookings" value={stats.total} icon={School} accent="#14213D" />
              <StatCard label="Tentative" value={stats.s['Tentative'] || 0} icon={Clock} accent="#F59E0B" />
              <StatCard label="Confirmed" value={stats.s['Confirmed'] || 0} icon={CheckCircle2} accent="#3B82F6" />
              <StatCard label="Students Booked" value={stats.students} icon={Users} accent="#10B981" />
              <StatCard label="Follow-ups Due" value={stats.pendingFollowUps} icon={AlertCircle} accent="#EF4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-display font-semibold text-slate-900 mb-4">Status Breakdown</h3>
                {pieData.length === 0 ? (
                  <div className="text-sm text-slate-400 py-12 text-center">No bookings yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                        {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name]?.dot || '#94A3B8'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <h3 className="font-display font-semibold text-slate-900 mb-4">Confirmed vs Tentative by Venue</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={venueBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="venue" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="Tentative" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Confirmed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="font-display font-semibold text-slate-900 mb-4">Follow-ups due today or overdue</h3>
              {upcoming.length === 0 ? (
                <div className="text-sm text-slate-400 py-6 text-center">Nothing overdue - nice work.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcoming.map((b) => (
                    <button key={b.id} onClick={() => router.push('/bookings')} className="w-full flex items-center justify-between py-3 text-left hover:bg-slate-50 px-2 -mx-2 rounded-lg transition">
                      <div>
                        <div className="text-sm font-medium text-slate-900">{b.school_name || 'Unnamed booking'}</div>
                        <div className="text-xs text-slate-500">{b.venue} · Follow up was due {b.follow_up_date}</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
