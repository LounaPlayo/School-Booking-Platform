'use client';

import { useState } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import {
  VENUES, EVENT_TYPES, EVENT_TIMES, STATUS_ALL, DEPOSIT_STATUSES, PAYMENT_METHODS, ADD_ON_FOOD_OPTIONS,
  isStatusLocked, isDepositLocked, isSealed, balanceDue, totalBalance,
} from '../lib/constants';

const inputCls = 'focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400';

function Field({ label, children, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, tint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4" style={tint ? { background: tint } : undefined}>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</h4>
      <div className="grid grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function PaymentSummary({ b }) {
  const total = parseFloat(b.total_price) || 0;
  const addOn = parseFloat(b.add_on_fee) || 0;
  const deposit = parseFloat(b.deposit_amount_received) || 0;
  const cash = parseFloat(b.settled_cash) || 0;
  const wish = parseFloat(b.settled_wish) || 0;
  const bank = parseFloat(b.settled_bank) || 0;
  const grandTotal = total + addOn;
  const remaining = Math.max(grandTotal - deposit - cash - wish - bank, 0);

  const parts = [{ label: 'Total', value: grandTotal }];
  if (deposit > 0) parts.push({ label: 'Deposit', value: deposit, minus: true });
  if (cash > 0) parts.push({ label: 'Cash', value: cash, minus: true });
  if (wish > 0) parts.push({ label: 'Wish', value: wish, minus: true });
  if (bank > 0) parts.push({ label: 'Bank', value: bank, minus: true });

  return (
    <div className="rounded-lg border border-emerald-200 px-3 py-2 mt-2" style={{ background: '#F0FBF3' }}>
      <div className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-sm">
        {parts.map((p, i) => (
          <span key={i} className="font-mono text-slate-700">
            {i > 0 && <span className="text-slate-400 mr-1.5">{p.minus ? '−' : ''}</span>}
            {p.label} {p.value.toFixed(2)}
          </span>
        ))}
        <span className="text-slate-400 mx-0.5">=</span>
        <span className="font-mono font-bold text-emerald-800">
          {remaining <= 0 ? 'Settled' : `Balance ${remaining.toFixed(2)}`}
        </span>
      </div>
    </div>
  );
}

export default function BookingForm({ booking, existing, profile, packageRates, onCancel, onSave, onDeleteRequest, namesById }) {
  const [b, setB] = useState(booking);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isApprover = profile.role === 'approver';
  // Once Confirmed/Completed, the WHOLE record is locked for non-approvers
  // - not just status/deposit. This matches the DB trigger, which blocks
  // any column change once a booking reaches that state.
  const formLocked = existing && isStatusLocked(booking) && !isApprover;
  const statusLocked = formLocked;
  const depositLocked = formLocked;
  const overriding = existing && isStatusLocked(booking) && isApprover;
  const sealed = existing && isSealed(booking);
  const rateMap = Object.fromEntries((packageRates || []).map((r) => [r.package_name, r.rate]));
  const packageOptions = [...(packageRates || []).map((r) => r.package_name), 'Special Offer'];
  const isSpecialOffer = b.package_selected === 'Special Offer';

  function set(k, v) {
    setB((prev) => {
      const next = { ...prev, [k]: v };

      // Entering an actual deposit amount received is what really means
      // "the deposit came in" - so that's what drives the auto-confirm,
      // not just picking "Received" from the dropdown (though that still
      // works too, for cases where the amount was already logged earlier).
      if (k === 'deposit_amount_received' && parseFloat(v) > 0) {
        next.deposit_status = 'Received';
        next.booking_status = 'Confirmed';
      }

      // Selecting Deposit Received directly confirms the booking too -
      // the two should never be out of sync, since a confirmed booking
      // can never be deleted once saved.
      if (k === 'deposit_status' && v === 'Received') {
        next.booking_status = 'Confirmed';
      }

      // Packages with a set rate auto-price against the student count,
      // and Total Price is locked (read-only) for these - see the field
      // below. Special Offer has no fixed rate and stays manually
      // editable, confirmed with an approver before finalizing.
      if (k === 'package_selected' && rateMap[v] !== undefined) {
        const students = parseFloat(next.number_of_students) || 0;
        next.total_price = (rateMap[v] * students).toString();
      }
      if (k === 'number_of_students' && rateMap[next.package_selected] !== undefined) {
        const students = parseFloat(v) || 0;
        next.total_price = (rateMap[next.package_selected] * students).toString();
      }

      return next;
    });
  }

  async function handleSave() {
    if (!b.school_name?.trim()) { setError('School name is required.'); return; }
    if (!b.event_date) { setError('Event date is required.'); return; }
    setError('');
    setSaving(true);
    await onSave(b);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-y-auto" style={{ maxHeight: '92vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{existing ? 'Edit Booking' : 'New Booking'}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {sealed && (
          <div className="mx-6 mt-4 seal-banner border text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <Lock size={15} /> This booking is Confirmed. Deletion is permanently blocked for everyone, including approvers.
          </div>
        )}
        {overriding && !sealed && (
          <div className="mx-6 mt-4 override-banner border text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <ShieldCheck size={15} /> This booking is Confirmed - you&apos;re editing it as an approver. This is recorded.
          </div>
        )}
        {existing && (b.created_by || b.updated_by) && namesById && (
          <div className="mx-6 mt-3 text-xs text-slate-400 flex flex-wrap gap-x-4">
            {b.created_by && <span>Created by {namesById[b.created_by] || 'Unknown'}</span>}
            {b.updated_by && <span>Last edited by {namesById[b.updated_by] || 'Unknown'}</span>}
            {b.approved_by && <span>Confirmed by {namesById[b.approved_by] || 'Unknown'}</span>}
          </div>
        )}

        <div className="p-6 space-y-4">
          <Section title="School &amp; Contact">
            <Field label="Venue">
              <select className={inputCls} value={b.venue} onChange={(e) => set('venue', e.target.value)}>
                {VENUES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Event Type">
              <select className={inputCls} value={b.event_type || ''} onChange={(e) => set('event_type', e.target.value)} disabled={formLocked}>
                {EVENT_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="School / Nursery Name" span>
              <input className={inputCls} value={b.school_name || ''} onChange={(e) => set('school_name', e.target.value)} placeholder="e.g. Kids World Nursery" disabled={formLocked} />
            </Field>
            <Field label="Contact Person"><input className={inputCls} value={b.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Phone"><input className={inputCls} value={b.phone || ''} onChange={(e) => set('phone', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Email" span><input className={inputCls} value={b.email || ''} onChange={(e) => set('email', e.target.value)} disabled={formLocked} /></Field>
          </Section>

          <Section title="Event Details">
            <Field label="Event Date"><input type="date" className={inputCls} value={b.event_date || ''} onChange={(e) => set('event_date', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Event Time">
              <select className={inputCls} value={b.event_time || ''} onChange={(e) => set('event_time', e.target.value)} disabled={formLocked}>
                <option value="">Select a time</option>
                {EVENT_TIMES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Grade Level / Age"><input className={inputCls} value={b.grade_level || ''} onChange={(e) => set('grade_level', e.target.value)} disabled={formLocked} /></Field>
            <Field label="# Students"><input type="number" className={inputCls} value={b.number_of_students || ''} onChange={(e) => set('number_of_students', e.target.value)} disabled={formLocked} /></Field>
          </Section>

          <Section title="Package &amp; Pricing">
            <Field label="Package">
              <select className={inputCls} value={b.package_selected || ''} onChange={(e) => set('package_selected', e.target.value)} disabled={formLocked}>
                {packageOptions.map((v) => <option key={v}>{v}</option>)}
              </select>
              {isSpecialOffer && (
                <p className="text-[11px] text-amber-700 mt-1">Special pricing - enter manually and confirm with an approver before finalizing.</p>
              )}
            </Field>
            <Field label="Total Price (AED)">
              <input
                type="number"
                className={inputCls}
                value={b.total_price || ''}
                onChange={(e) => set('total_price', e.target.value)}
                disabled={formLocked || !isSpecialOffer}
              />
              {!isSpecialOffer && <p className="text-[11px] text-slate-400 mt-1">Auto-calculated from package rate × students.</p>}
            </Field>
          </Section>

          <Section title="Add-On" tint="#FFF9EC">
            <Field label="Add-On Food">
              <select className={inputCls} value={b.add_on_food || 'None'} onChange={(e) => set('add_on_food', e.target.value)} disabled={formLocked}>
                {ADD_ON_FOOD_OPTIONS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Add-On Fee (AED)">
              <input type="number" className={inputCls} value={b.add_on_fee || ''} onChange={(e) => set('add_on_fee', e.target.value)} disabled={formLocked} />
            </Field>
          </Section>

          <Section title="Deposit &amp; Payment" tint="#F8FAFC">
            <Field label={<span className="flex items-center gap-1">Deposit Status {depositLocked && <Lock size={11} />}</span>}>
              <select className={inputCls} value={b.deposit_status} onChange={(e) => set('deposit_status', e.target.value)} disabled={depositLocked}>
                {DEPOSIT_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Deposit Amount Received"><input type="number" className={inputCls} value={b.deposit_amount_received || ''} onChange={(e) => set('deposit_amount_received', e.target.value)} disabled={depositLocked} /></Field>
            <Field label="Deposit Date"><input type="date" className={inputCls} value={b.deposit_date || ''} onChange={(e) => set('deposit_date', e.target.value)} disabled={depositLocked} /></Field>
            <Field label="Payment Method">
              <select className={inputCls} value={b.payment_method || ''} onChange={(e) => set('payment_method', e.target.value)} disabled={depositLocked}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Balance Due (AED)"><input className={inputCls} value={balanceDue(b).toFixed(2)} disabled /></Field>
            <Field label="Total Balance incl. Add-On (AED)"><input className={inputCls} value={totalBalance(b).toFixed(2)} disabled /></Field>
          </Section>

          <Section title="Status &amp; Assignment">
            <Field label={<span className="flex items-center gap-1">Booking Status {statusLocked && <Lock size={11} />}</span>}>
              <select className={inputCls} value={b.booking_status} onChange={(e) => set('booking_status', e.target.value)} disabled={statusLocked}>
                {STATUS_ALL.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Follow-up Date"><input type="date" className={inputCls} value={b.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Team Assigned" span><input className={inputCls} value={b.team_assigned || ''} onChange={(e) => set('team_assigned', e.target.value)} disabled={formLocked} /></Field>
          </Section>

          {(b.booking_status === 'Completed' || existing) && (
            <Section title="Completion &amp; Settlement" tint="#F0FBF3">
              <Field label="Settled - Cash (AED)"><input type="number" className={inputCls} value={b.settled_cash || ''} onChange={(e) => set('settled_cash', e.target.value)} disabled={formLocked} /></Field>
              <Field label="Settled - Wish (AED)"><input type="number" className={inputCls} value={b.settled_wish || ''} onChange={(e) => set('settled_wish', e.target.value)} disabled={formLocked} /></Field>
              <Field label="Settled - Bank (AED)"><input type="number" className={inputCls} value={b.settled_bank || ''} onChange={(e) => set('settled_bank', e.target.value)} disabled={formLocked} /></Field>
              <Field label="Settlement Date"><input type="date" className={inputCls} value={b.balance_settled_date || ''} onChange={(e) => set('balance_settled_date', e.target.value)} disabled={formLocked} /></Field>
              <div className="col-span-2"><PaymentSummary b={b} /></div>
            </Section>
          )}

          <Section title="Notes">
            <Field label="Special Requests / Notes" span><textarea className={inputCls} rows={2} value={b.notes || ''} onChange={(e) => set('notes', e.target.value)} disabled={formLocked} /></Field>
          </Section>
        </div>

        {error && <div className="mx-6 mb-2 text-sm text-red-600">{error}</div>}

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          {existing && !sealed ? (
            <button onClick={() => onDeleteRequest(b)} className="text-sm font-semibold text-red-500 hover:text-red-600">Delete booking</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleSave} disabled={saving || formLocked} className="btn-primary px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
