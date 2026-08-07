'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';
import { VENUES, STATUS_ALL, grandTotal, balanceDue, settledTotal } from '../../lib/constants';

function toDate(dateStr) {
  if (!dateStr) return '';
  // Plain "YYYY-MM-DD" strings from Postgres - build a local date so it
  // doesn't shift a day in either direction depending on timezone.
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d);
}

export default function ReportsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [namesById, setNamesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [venueFilter, setVenueFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDateVal, setToDateVal] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const [{ data: b }, { data: profiles }] = await Promise.all([
        supabase.from('bookings').select('*').order('serial_number', { ascending: true }),
        supabase.from('profiles').select('id, name'),
      ]);
      setBookings(b || []);
      const map = {};
      (profiles || []).forEach((p) => { map[p.id] = p.name; });
      setNamesById(map);
      setLoading(false);
    })();
  }, [profile]);

  const filtered = useMemo(() => bookings.filter((b) => {
    if (venueFilter !== 'All' && b.venue !== venueFilter) return false;
    if (statusFilter !== 'All' && b.booking_status !== statusFilter) return false;
    if (fromDate && (!b.event_date || b.event_date < fromDate)) return false;
    if (toDateVal && (!b.event_date || b.event_date > toDateVal)) return false;
    return true;
  }), [bookings, venueFilter, statusFilter, fromDate, toDateVal]);

  async function handleExport() {
    setExporting(true);
    try {
      const XLSX = await import('xlsx');

      const rows = filtered.map((b) => ({
        '#': b.serial_number,
        'School / Nursery Name': b.school_name || '',
        'Contact Person': b.contact_person || '',
        'Phone': b.phone || '',
        'Email': b.email || '',
        'Venue': b.venue || '',
        'Event Type': b.event_type || '',
        'Event Date': toDate(b.event_date),
        'Event Time': b.event_time || '',
        'Grade Level / Age': b.grade_level || '',
        'Students Booked': b.number_of_students ?? '',
        'Final Kids Present': b.final_number_of_kids ?? '',
        'Package Selected': b.package_selected || '',
        'Package Total ($)': parseFloat(b.total_price) || 0,
        'Add-On Food': b.add_on_food && b.add_on_food !== 'None' ? b.add_on_food : '',
        'Add-On Fee ($)': parseFloat(b.add_on_fee) || 0,
        'Grand Total ($)': grandTotal(b),
        'Deposit Status': b.deposit_status || '',
        'Deposit Amount ($)': parseFloat(b.deposit_amount_received) || 0,
        'Deposit Date': toDate(b.deposit_date),
        'Deposit Payment Method': b.payment_method || '',
        'Balance Due ($)': balanceDue(b),
        'Settled Cash ($)': parseFloat(b.settled_cash) || 0,
        'Settled Whish ($)': parseFloat(b.settled_wish) || 0,
        'Settled Bank ($)': parseFloat(b.settled_bank) || 0,
        'Total Settled ($)': settledTotal(b),
        'Total Collected ($)': (parseFloat(b.deposit_amount_received) || 0) + settledTotal(b),
        'Settlement Date': toDate(b.balance_settled_date),
        'Booking Status': b.booking_status || '',
        'Team Assigned': b.team_assigned || '',
        'Follow-up Date': toDate(b.follow_up_date),
        'Notes': b.notes || '',
        'Created By': namesById[b.created_by] || '',
        'Created At': b.created_at ? new Date(b.created_at) : '',
        'Last Updated By': namesById[b.updated_by] || '',
        'Confirmed By': namesById[b.approved_by] || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows, { cellDates: true, dateNF: 'yyyy-mm-dd' });
      ws['!cols'] = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.min(Math.max(key.length, 12), 28),
      }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Bookings Report');

      const stamp = new Date().toISOString().slice(0, 10);
      const scopeLabel = venueFilter === 'All' ? 'All-Venues' : venueFilter.replace(/\s+/g, '-');
      XLSX.writeFile(wb, `School-Events-Report_${scopeLabel}_${stamp}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const totalGrand = filtered.reduce((sum, b) => sum + grandTotal(b), 0);
  const totalCollected = filtered.reduce((sum, b) => sum + (parseFloat(b.deposit_amount_received) || 0) + settledTotal(b), 0);

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="font-display text-xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Export the full lifecycle of every event to Excel</p>
      </header>

      <div className="p-8">
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileSpreadsheet size={16} className="text-slate-500" />
            <h3 className="font-display font-semibold text-slate-900">Export Filters</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Venue</label>
              <select className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" value={venueFilter} onChange={(e) => setVenueFilter(e.target.value)}>
                <option>All</option>{VENUES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Status</label>
              <select className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option>All</option>{STATUS_ALL.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Event Date From</label>
              <input type="date" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Event Date To</label>
              <input type="date" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" value={toDateVal} onChange={(e) => setToDateVal(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 py-6 text-center">Loading…</div>
          ) : (
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="rounded-lg border border-slate-100 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Bookings in export</div>
                <div className="font-display text-xl font-bold text-slate-900">{filtered.length}</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Grand total ($)</div>
                <div className="font-display text-xl font-bold text-slate-900">${totalGrand.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-slate-100 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Total collected ($)</div>
                <div className="font-display text-xl font-bold text-slate-900">${totalCollected.toFixed(2)}</div>
              </div>
            </div>
          )}

          <button
            onClick={handleExport}
            disabled={loading || exporting || filtered.length === 0}
            className="btn-primary px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-60"
          >
            <Download size={16} /> {exporting ? 'Building file…' : `Export ${filtered.length} booking${filtered.length === 1 ? '' : 's'} to Excel`}
          </button>
          <p className="text-[11px] text-slate-400 mt-2">
            Covers every stage: booking details, package &amp; pricing, deposit, settlement breakdown, final headcount vs. booked, and who did what.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
