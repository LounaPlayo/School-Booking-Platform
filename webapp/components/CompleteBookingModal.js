'use client';

import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';
import { PAYMENT_METHODS, balanceDue, totalBalance } from '../lib/constants';

export default function CompleteBookingModal({ booking, onCancel, onConfirm }) {
  const [method, setMethod] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const due = totalBalance(booking);

  async function handleConfirm() {
    if (!method) { setError('Select how the balance was settled.'); return; }
    setError('');
    setSaving(true);
    await onConfirm({ balance_settled_method: method, balance_settled_date: date });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#D4F7DA' }}>
          <CheckCircle2 size={18} style={{ color: '#166534' }} />
        </div>
        <h3 className="font-display font-bold text-slate-900 mb-1">Complete this booking</h3>
        <p className="text-sm text-slate-500 mb-4">
          {booking.school_name || 'This booking'} — remaining balance{' '}
          <span className="font-semibold text-slate-700">AED {due.toFixed(2)}</span>
        </p>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Settled by</label>
        <select className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="">Select a method</option>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Settlement date</label>
        <input type="date" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4" value={date} onChange={(e) => setDate(e.target.value)} />

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="btn-primary px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60">
            {saving ? 'Saving…' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
