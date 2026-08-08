'use client';

import { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import DualCurrencyInput from './DualCurrencyInput';
import { ADD_ON_FOOD_OPTIONS } from '../lib/constants';

function SummaryRow({ label, value, bold }) {
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span className="text-sm">{label}</span>
      <span className="text-sm font-mono">${value.toFixed(2)}</span>
    </div>
  );
}

export default function CompleteBookingModal({ booking, onCancel, onConfirm }) {
  const isCorrection = booking.booking_status === 'Completed';
  const tentativeKids = parseFloat(booking.number_of_students) || 0;
  const originalTotalPrice = parseFloat(booking.total_price) || 0;
  const depositReceived = parseFloat(booking.deposit_amount_received) || 0;
  // The implied per-student rate from the original booking - works for
  // Special Offer pricing too, since it's just total price / kids booked.
  const perStudentRate = tentativeKids > 0 ? originalTotalPrice / tentativeKids : 0;

  const [finalKids, setFinalKids] = useState(booking.final_number_of_kids ?? booking.number_of_students ?? '');
  const [teamAssigned, setTeamAssigned] = useState(booking.team_assigned || '');
  const [addOnFood, setAddOnFood] = useState(booking.add_on_food || 'None');
  const [addOnFee, setAddOnFee] = useState(booking.add_on_fee || '');
  const [cash, setCash] = useState(booking.settled_cash || '');
  const [wish, setWish] = useState(booking.settled_wish || '');
  const [bank, setBank] = useState(booking.settled_bank || '');
  const [date, setDate] = useState(booking.balance_settled_date || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const finalKidsNum = parseFloat(finalKids) || 0;
  const addOnFeeNum = parseFloat(addOnFee) || 0;
  // Recalculate the actual total owed against the FINAL headcount, not
  // the original tentative one - fewer/more kids than booked changes
  // what's actually owed, and so can the final add-on choice.
  const adjustedTotalPrice = Math.round(perStudentRate * finalKidsNum * 100) / 100;
  const grandTotal = adjustedTotalPrice + addOnFeeNum;
  const due = Math.max(grandTotal - depositReceived, 0);

  const settled = (parseFloat(cash) || 0) + (parseFloat(wish) || 0) + (parseFloat(bank) || 0);
  const diff = Math.round((settled - due) * 100) / 100;
  const isShort = diff < 0;
  const kidsChanged = tentativeKids > 0 && finalKidsNum !== tentativeKids;

  async function handleConfirm() {
    if (isShort) return; // blocked - guarded in the UI too, this is just a safety net
    setSaving(true);
    await onConfirm({
      settled_cash: parseFloat(cash) || 0,
      settled_wish: parseFloat(wish) || 0,
      settled_bank: parseFloat(bank) || 0,
      balance_settled_date: date,
      team_assigned: teamAssigned,
      final_number_of_kids: finalKidsNum,
      total_price: adjustedTotalPrice, // keeps the DB's settlement math consistent with what's actually owed
      add_on_food: addOnFood,
      add_on_fee: addOnFeeNum,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: '#D4F7DA' }}>
          <CheckCircle2 size={18} style={{ color: '#166534' }} />
        </div>
        <h3 className="font-display font-bold text-slate-900 mb-1">{isCorrection ? 'Edit settlement' : 'Complete this booking'}</h3>
        <p className="text-sm text-slate-500 mb-4">{booking.school_name || 'This booking'}</p>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Final number of kids {tentativeKids > 0 && <span className="normal-case font-normal text-slate-400">(booked: {tentativeKids})</span>}
        </label>
        <input
          type="number"
          className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-1"
          value={finalKids}
          onChange={(e) => setFinalKids(e.target.value)}
        />
        {kidsChanged && (
          <p className="text-[11px] text-amber-700 mb-3">
            Differs from the {tentativeKids} booked - amount recalculated at ${perStudentRate.toFixed(2)}/kid.
          </p>
        )}
        {!kidsChanged && <div className="mb-3" />}

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Team assigned</label>
        <input
          className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4"
          value={teamAssigned}
          onChange={(e) => setTeamAssigned(e.target.value)}
          placeholder="Names of staff who worked the event"
        />

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Add-On</label>
        <div className="flex gap-2 mb-4">
          <select
            className="focus-ring flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={addOnFood}
            onChange={(e) => setAddOnFood(e.target.value)}
          >
            {ADD_ON_FOOD_OPTIONS.map((v) => <option key={v}>{v}</option>)}
          </select>
          <input
            type="number"
            className="focus-ring w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg"
            value={addOnFee}
            onChange={(e) => setAddOnFee(e.target.value)}
            placeholder="Fee $"
          />
        </div>

        <div className="rounded-lg border border-slate-200 p-3 mb-4" style={{ background: '#FAFBFC' }}>
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Summary</h4>
          <SummaryRow label="Total Amount" value={adjustedTotalPrice} />
          {addOnFeeNum > 0 && <SummaryRow label="+ Add-On" value={addOnFeeNum} />}
          <SummaryRow label="Grand Total" value={grandTotal} />
          <SummaryRow label="− Deposit Paid" value={depositReceived} />
          <div className="border-t border-slate-300 my-1" />
          <SummaryRow label="Balance Due" value={due} bold />
        </div>

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          How was it settled? <span className="normal-case font-normal text-slate-400">(enter in $ or switch to LBP)</span>
        </label>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-12 shrink-0">Cash</span>
            <div className="flex-1"><DualCurrencyInput value={cash} onChange={setCash} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-12 shrink-0">Whish</span>
            <div className="flex-1"><DualCurrencyInput value={wish} onChange={setWish} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 w-12 shrink-0">Bank</span>
            <div className="flex-1"><DualCurrencyInput value={bank} onChange={setBank} /></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-4 px-1">
          <span className="text-slate-500">Total entered</span>
          <span className="font-semibold text-slate-800">${settled.toFixed(2)}</span>
        </div>

        {isShort && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>
              This is ${Math.abs(diff).toFixed(2)} short of the balance due. The full amount must be entered before this booking can be marked Completed - partial settlements aren&apos;t allowed.
            </span>
          </div>
        )}
        {!isShort && diff > 0 && (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>This is ${diff.toFixed(2)} more than the balance due - that&apos;s fine if it&apos;s correct (e.g. a tip or rounding).</span>
          </div>
        )}

        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Settlement date</label>
        <input type="date" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-5" value={date} onChange={(e) => setDate(e.target.value)} />

        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
          <button onClick={handleConfirm} disabled={saving || isShort} className="btn-primary px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60">
            {saving ? 'Saving…' : isCorrection ? 'Save Changes' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
