'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, ChevronRight } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export default function ClientsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: c }, { data: b }] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('bookings').select('id, client_id, venue, event_date, booking_status'),
      ]);
      setClients(c || []);
      setBookings(b || []);
      setLoading(false);
    })();
  }, [profile]);

  const bookingCounts = useMemo(() => {
    const counts = {};
    bookings.forEach((b) => {
      if (!b.client_id) return;
      counts[b.client_id] = (counts[b.client_id] || 0) + 1;
    });
    return counts;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients
      .filter((c) => !q || c.name.toLowerCase().includes(q) || (c.contact_person || '').toLowerCase().includes(q) || (c.phone || '').includes(q))
      .sort((a, b) => (bookingCounts[b.id] || 0) - (bookingCounts[a.id] || 0));
  }, [clients, search, bookingCounts]);

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="font-display text-xl font-bold text-slate-900">Clients</h1>
        <p className="text-sm text-slate-500 mt-0.5">Every school &amp; nursery that's booked with you, reusable across future bookings</p>
      </header>

      <div className="p-8">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, contact, or phone…"
                className="focus-ring w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg"
              />
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-400">
              <Users size={13} /> {clients.length} clients
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No clients match. Clients are created automatically the first time you book them.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Contact Person</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold text-right">Bookings</th>
                    <th className="px-5 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/bookings?search=${encodeURIComponent(c.name)}`)}
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.contact_person || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{c.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.email || '—'}</td>
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">{bookingCounts[c.id] || 0}</td>
                      <td className="px-5 py-3.5 text-right"><ChevronRight size={15} className="text-slate-300 inline" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
