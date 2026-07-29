'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus, X, Lock, Search } from 'lucide-react';
import AppShell from '../../components/AppShell';
import BookingForm from '../../components/BookingForm';
import CompleteBookingModal from '../../components/CompleteBookingModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { VENUES, STATUS_ALL, isSealed } from '../../lib/constants';

export default function BookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [namesById, setNamesById] = useState({});
  const [packageRates, setPackageRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueFilter, setVenueFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function loadAll() {
    setLoading(true);
    const [{ data: b }, { data: profiles }, { data: rates }] = await Promise.all([
      supabase.from('bookings').select('*').order('event_date', { ascending: true }),
      supabase.from('profiles').select('id, name'),
      supabase.from('package_rates').select('*').order('package_name'),
    ]);
    setBookings(b || []);
    const map = {};
    (profiles || []).forEach((p) => { map[p.id] = p.name; });
    setNamesById(map);
    setPackageRates(rates || []);
    setLoading(false);
  }

  useEffect(() => { if (profile) loadAll(); }, [profile]);

  function emptyBooking() {
    return {
      venue: 'Playo', school_name: '', contact_person: '', phone: '', email: '',
      event_date: '', event_time: '', event_type: 'School Trip / Field Visit',
      grade_level: '', number_of_students: '',
      package_selected: 'Package A', total_price: '',
      deposit_status: 'Not Requested', deposit_amount_received: '', deposit_date: '', payment_method: '',
      add_on_food: 'None', add_on_fee: '',
      booking_status: 'Tentative', team_assigned: '',
      notes: '', follow_up_date: '',
    };
  }

  // Postgres numeric columns reject "" (empty string) - they need an
  // actual number or null. This converts any blank numeric field before
  // it's sent, so a removed/skipped field can never cause a save error.
  const NUMERIC_FIELDS = ['number_of_students', 'total_price', 'deposit_amount_received', 'add_on_fee'];
  const DATE_FIELDS = ['event_date', 'deposit_date', 'follow_up_date', 'balance_settled_date'];
  function sanitize(b) {
    const out = { ...b };
    NUMERIC_FIELDS.forEach((k) => { if (out[k] === '' || out[k] === undefined) out[k] = null; });
    DATE_FIELDS.forEach((k) => { if (out[k] === '' || out[k] === undefined) out[k] = null; });
    return out;
  }

  function openNew() { setEditing(emptyBooking()); setShowForm(true); }
  function openEdit(b) { setEditing({ ...b }); setShowForm(true); }

  async function saveBooking(rawB) {
    setErrorMsg('');
    const b = sanitize(rawB);
    const wasLockedBefore = b.id ? bookings.find((x) => x.id === b.id) : null;
    const payload = { ...b, updated_by: profile.id };
    if (b.booking_status === 'Confirmed' || b.booking_status === 'Completed') {
      if (!wasLockedBefore || !(wasLockedBefore.booking_status === 'Confirmed' || wasLockedBefore.booking_status === 'Completed')) {
        payload.approved_by = profile.id;
      }
    }

    let error;
    if (b.id) {
      ({ error } = await supabase.from('bookings').update(payload).eq('id', b.id));
    } else {
      payload.created_by = profile.id;
      ({ error } = await supabase.from('bookings').insert(payload));
    }

    if (error) {
      setErrorMsg(error.message);
      return;
    }
    setShowForm(false); setEditing(null);
    loadAll();
  }

  async function deleteBooking(b) {
    setErrorMsg('');
    const { error } = await supabase.from('bookings').delete().eq('id', b.id);
    if (error) {
      setErrorMsg("This booking couldn't be deleted - it's sealed at the database level.");
    }
    setDeleteConfirm(null);
    loadAll();
  }

  const [completeTarget, setCompleteTarget] = useState(null);

  async function confirmCompletion({ balance_settled_method, balance_settled_date }) {
    setErrorMsg('');
    const { error } = await supabase
      .from('bookings')
      .update({
        booking_status: 'Completed',
        balance_settled_method,
        balance_settled_date,
        updated_by: profile.id,
      })
      .eq('id', completeTarget.id);
    if (error) setErrorMsg(error.message);
    setCompleteTarget(null);
    loadAll();
  }

  const filtered = useMemo(() => bookings.filter((b) => {
    if (venueFilter !== 'All' && b.venue !== venueFilter) return false;
    if (statusFilter !== 'All' && b.booking_status !== statusFilter) return false;
    if (search && !(`${b.school_name} ${b.contact_person}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  }), [bookings, venueFilter, statusFilter, search]);

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">All Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Playo &amp; Oh Chateau school events</p>
        </div>
        <button onClick={openNew} className="btn-primary px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
          <Plus size={16} /> New Booking
        </button>
      </header>

      <div className="p-8">
        {errorMsg && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{errorMsg}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search school or contact…" className="focus-ring w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg" />
            </div>
            <select value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)} className="focus-ring text-sm border border-slate-200 rounded-lg px-3 py-2">
              <option>All</option>{VENUES.map((v) => <option key={v}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="focus-ring text-sm border border-slate-200 rounded-lg px-3 py-2">
              <option>All</option>{STATUS_ALL.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No bookings match. Add one with &quot;New Booking&quot; above.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase tracking-wide border-b border-slate-200">
                    <th className="px-5 py-3 font-semibold">School</th>
                    <th className="px-5 py-3 font-semibold">Venue</th>
                    <th className="px-5 py-3 font-semibold">Event Date</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Deposit</th>
                    <th className="px-5 py-3 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((b) => {
                    const sealed = isSealed(b);
                    return (
                      <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openEdit(b)}>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-slate-900">{b.school_name || <span className="text-slate-400 italic">Unnamed</span>}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{b.venue}</td>
                        <td className="px-5 py-3.5 text-slate-600">{b.event_date || '—'}</td>
                        <td className="px-5 py-3.5"><StatusPill status={b.booking_status} /></td>
                        <td className="px-5 py-3.5 text-slate-600">{b.deposit_status}</td>
                        <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3 justify-end">
                            {b.booking_status === 'Confirmed' && profile.role === 'approver' && (
                              <button onClick={() => setCompleteTarget(b)} className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">Mark Completed</button>
                            )}
                            {sealed ? (
                              <span title="Confirmed - permanent record" className="seal-badge"><Lock size={15} /></span>
                            ) : (
                              <button title="Delete booking" onClick={() => setDeleteConfirm(b)} className="text-slate-300 hover:text-red-500"><X size={16} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showForm && editing && (
        <BookingForm
          booking={editing}
          existing={!!editing.id}
          profile={profile}
          namesById={namesById}
          packageRates={packageRates}
          onCancel={() => { setShowForm(false); setEditing(null); }}
          onSave={saveBooking}
          onDeleteRequest={(b) => { setShowForm(false); setDeleteConfirm(b); }}
        />
      )}
      {deleteConfirm && (
        <DeleteConfirmModal booking={deleteConfirm} onCancel={() => setDeleteConfirm(null)} onConfirm={() => deleteBooking(deleteConfirm)} />
      )}
      {completeTarget && (
        <CompleteBookingModal booking={completeTarget} onCancel={() => setCompleteTarget(null)} onConfirm={confirmCompletion} />
      )}
    </AppShell>
  );
}
