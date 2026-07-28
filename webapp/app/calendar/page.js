'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { STATUS_COLORS } from '../../lib/constants';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('bookings')
      .select('*')
      .in('booking_status', ['Confirmed', 'Tentative'])
      .then(({ data }) => {
        setBookings(data || []);
        setLoading(false);
      });
  }, [profile]);

  const byDate = useMemo(() => {
    const map = {};
    bookings.forEach((b) => {
      if (!b.event_date) return;
      (map[b.event_date] ||= []).push(b);
    });
    return map;
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = toDateKey(new Date());
  const selectedList = selectedDay ? byDate[selectedDay] || [] : [];

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">Calendar</h1>
          <p className="text-sm text-slate-500 mt-0.5">Confirmed and Tentative bookings by date</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronLeft size={16} />
          </button>
          <span className="font-display font-semibold text-slate-800 w-36 text-center">{monthLabel}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>

      <div className="p-8">
        {loading ? (
          <div className="text-sm text-slate-400 py-24 text-center">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-200">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} className="border-b border-r border-slate-100 min-h-[96px] bg-slate-50/40" />;
                  const key = toDateKey(date);
                  const dayBookings = byDate[key] || [];
                  const isToday = key === todayKey;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(key)}
                      className={`text-left border-b border-r border-slate-100 min-h-[96px] p-1.5 hover:bg-slate-50 transition ${
                        selectedDay === key ? 'ring-2 ring-inset ring-navy' : ''
                      }`}
                    >
                      <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-navy text-white' : 'text-slate-500'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayBookings.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
                            style={{ background: STATUS_COLORS[b.booking_status]?.bg, color: STATUS_COLORS[b.booking_status]?.text }}
                            title={`${b.school_name} — ${b.venue}`}
                          >
                            {b.school_name || 'Booking'}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] text-slate-400 px-1">+{dayBookings.length - 3} more</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
              <div className="flex items-center gap-4 mb-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS['Confirmed'].dot }} />Confirmed</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS['Tentative'].dot }} />Tentative</span>
              </div>
              <h3 className="font-display font-semibold text-slate-900 mb-3">
                {selectedDay ? new Date(selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a day'}
              </h3>
              {!selectedDay ? (
                <p className="text-sm text-slate-400">Click any date to see its bookings.</p>
              ) : selectedList.length === 0 ? (
                <p className="text-sm text-slate-400">No confirmed or tentative bookings on this day.</p>
              ) : (
                <div className="space-y-3">
                  {selectedList.map((b) => (
                    <div key={b.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800">{b.school_name || 'Unnamed booking'}</span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: STATUS_COLORS[b.booking_status]?.bg, color: STATUS_COLORS[b.booking_status]?.text }}
                        >
                          {b.booking_status}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">{b.venue}{b.event_time ? ` · ${b.event_time}` : ''}</div>
                    </div>
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
