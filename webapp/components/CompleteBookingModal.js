'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { totalBalance } from '../lib/constants';

export default function CompleteBookingModal({ booking, onCancel, onConfirm }) {
  const isCorrection = booking.booking_status === 'Completed';
  const [cash, setCash] = useState(booking.settled_cash || '');
  const [wish, setWish] = useState(booking.settled_wish || '');
  const [bank, setBank] = useState(booking.settled_bank || '');
  const [date, setDate] = useState(booking.balance_settled_date || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const due = totalBalance(booking);
  const settled = (parseFloat(cash) || 0) + (parseFloat(wish) || 0) + (parseFloat(bank) || 0);
  const diff = Math.round((settled - due) * 100) / 100;

  async function handleConfirm() {
    setSaving(true);
    await onConfirm({
      settled_cash: parseFloat(cash) || 0,
      settled_wish: parseFloat(wish) || 0,
      settled_bank: parseFloat(bank) || 0,
      balance_settled_date: date,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#D4F7DA' }}>
          <CheckCircle2 size={18} style={{ color: '#166534' }} />
        </div>
        <h3 className="font-display font-bold text-slate-900 mb-1">{isCorrection ? 'Edit settlement' : 'Complete this booking'}</h3>
        <p className="text-sm text-slate-500 mb-4">
          {booking.school_name || 'This booking'} — balance due{' '}
          <span className="font-semibold text-slate-700">AED {due.toFixed(2)}</span>
        </p>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">How was it settled?</label>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-14">Cash</span>
            <input type="number" className="focus-ring flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-14">Wish</span>
            <input type="number" className="focus-ring flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" value={wish} onChange={(e) => setWish(e.target.value)} placeholder="0" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-14">Bank</span>
            <input type="number" className="focus-ring flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="0" />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-4 px-1">
          <span className="text-slate-500">Total entered</span>
          <span className="font-semibold text-slate-800">AED {settled.toFixed(2)}</span>
        </div>

        {diff !== 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              {diff > 0
                ? `This is AED ${diff.toFixed(2)} more than the balance due.`
                : `This is AED ${Math.abs(diff).toFixed(2)} short of the balance due.`}
              {' '}You can still save this if it's correct (e.g. a discount or rounding).
            </span>
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Settlement date</label>
        <input type="date" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-5" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleConfirm} disabled={saving} className="btn-primary px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60">
            {saving ? 'Saving…' : isCorrection ? 'Save Changes' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
