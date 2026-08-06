'use client';

import { useState } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import DualCurrencyInput from './DualCurrencyInput';
import PhoneInput from './PhoneInput';
import {
  VENUES, EVENT_TYPES, EVENT_TIMES, STATUS_ALL, DEPOSIT_STATUSES, PAYMENT_METHODS, ADD_ON_FOOD_OPTIONS,
  isStatusLocked, balanceDue, grandTotal,
} from '../lib/constants';

const inputCls = 'focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400';

function Field({ label, children, span, required }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
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

export default function BookingForm({ booking, existing, profile, packageRates, onCancel, onSave, onDeleteRequest, namesById }) {
  const [b, setB] = useState(booking);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isApprover = profile.role === 'approver';
  // Once Confirmed/Completed, the record is locked for non-approvers -
  // Agents can't touch or delete it. Approvers can edit or revert it
  // freely, by design: this restriction is specifically to keep Agents
  // out, not to limit Approvers.
  const formLocked = existing && isStatusLocked(booking) && !isApprover;
  const statusLocked = formLocked;
  const depositLocked = formLocked;
  const overriding = existing && isStatusLocked(booking) && isApprover;
  const rateMap = Object.fromEntries((packageRates || []).map((r) => [r.package_name, r.rate]));
  const packageOptions = [...(packageRates || []).map((r) => r.package_name), 'Special Offer'];
  const isSpecialOffer = b.package_selected === 'Special Offer';
  const depositMandatory = b.booking_status === 'Confirmed' || b.booking_status === 'Completed';

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
    const willBeConfirmed = b.booking_status === 'Confirmed' || b.booking_status === 'Completed';

    // School & Contact - all mandatory except Email
    if (!b.school_name?.trim()) { setError('School / Nursery Name is required.'); return; }
    if (!b.contact_person?.trim()) { setError('Contact Person is required.'); return; }
    const phoneDigits = (b.phone || '').replace(/^\+\d+\s*/, '').trim();
    if (!phoneDigits) { setError('Phone number is required.'); return; }

    // Event Details - all mandatory
    if (!b.event_date) { setError('Event Date is required.'); return; }
    if (!b.event_time) { setError('Event Time is required.'); return; }
    if (!b.grade_level?.trim()) { setError('Grade Level / Age is required.'); return; }
    if (!b.number_of_students || parseFloat(b.number_of_students) <= 0) { setError('# Students is required.'); return; }

    // Deposit & Payment - mandatory only once the booking is Confirmed/Completed,
    // since that's the point the deposit is supposed to already be in hand.
    if (willBeConfirmed) {
      if (!b.deposit_status) { setError('Deposit Status is required once a booking is Confirmed.'); return; }
      if (!b.deposit_amount_received || parseFloat(b.deposit_amount_received) <= 0) {
        setError('Deposit Amount Received is required once a booking is Confirmed.');
        return;
      }
      if (!b.deposit_date) { setError('Deposit Date is required once a booking is Confirmed.'); return; }
      if (!b.payment_method) { setError('Payment Method is required once a booking is Confirmed.'); return; }
    }

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

        {formLocked && (
          <div className="mx-6 mt-4 seal-banner border text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <Lock size={15} /> This booking is Confirmed. Only an approver can edit or delete it here - to close the final settlement, use &quot;Mark Completed&quot; on the bookings list instead.
          </div>
        )}
        {overriding && (
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
            <Field label="Venue" required>
              <select className={inputCls} value={b.venue} onChange={(e) => set('venue', e.target.value)}>
                {VENUES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Event Type" required>
              <select className={inputCls} value={b.event_type || ''} onChange={(e) => set('event_type', e.target.value)} disabled={formLocked}>
                {EVENT_TYPES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="School / Nursery Name" span required>
              <input className={inputCls} value={b.school_name || ''} onChange={(e) => set('school_name', e.target.value)} placeholder="e.g. Kids World Nursery" disabled={formLocked} />
            </Field>
            <Field label="Contact Person" required><input className={inputCls} value={b.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Phone" required><PhoneInput value={b.phone || ''} onChange={(v) => set('phone', v)} disabled={formLocked} /></Field>
            <Field label="Email" span><input className={inputCls} value={b.email || ''} onChange={(e) => set('email', e.target.value)} disabled={formLocked} /></Field>
          </Section>

          <Section title="Event Details">
            <Field label="Event Date" required><input type="date" className={inputCls} value={b.event_date || ''} onChange={(e) => set('event_date', e.target.value)} disabled={formLocked} /></Field>
            <Field label="Event Time" required>
              <select className={inputCls} value={b.event_time || ''} onChange={(e) => set('event_time', e.target.value)} disabled={formLocked}>
                <option value="">Select a time</option>
                {EVENT_TIMES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Grade Level / Age" required><input className={inputCls} value={b.grade_level || ''} onChange={(e) => set('grade_level', e.target.value)} disabled={formLocked} /></Field>
            <Field label="# Students" required><input type="number" className={inputCls} value={b.number_of_students || ''} onChange={(e) => set('number_of_students', e.target.value)} disabled={formLocked} /></Field>
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
            <Field label="Total Price ($)">
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
            <Field label="Add-On Fee ($)">
              <input type="number" className={inputCls} value={b.add_on_fee || ''} onChange={(e) => set('add_on_fee', e.target.value)} disabled={formLocked} />
            </Field>
            <Field label="Grand Total incl. Add-On ($)"><input className={inputCls} value={grandTotal(b).toFixed(2)} disabled /></Field>
          </Section>

          <Section title="Deposit &amp; Payment" tint="#F8FAFC">
            <Field label={<span className="flex items-center gap-1">Deposit Status {depositLocked && <Lock size={11} />}</span>} required={depositMandatory}>
              <select className={inputCls} value={b.deposit_status} onChange={(e) => set('deposit_status', e.target.value)} disabled={depositLocked}>
                {DEPOSIT_STATUSES.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Deposit Amount Received ($)" required={depositMandatory}>
              <DualCurrencyInput value={b.deposit_amount_received || ''} onChange={(v) => set('deposit_amount_received', v)} disabled={depositLocked} />
            </Field>
            <Field label="Deposit Date" required={depositMandatory}><input type="date" className={inputCls} value={b.deposit_date || ''} onChange={(e) => set('deposit_date', e.target.value)} disabled={depositLocked} /></Field>
            <Field label="Payment Method" required={depositMandatory}>
              <select className={inputCls} value={b.payment_method || ''} onChange={(e) => set('payment_method', e.target.value)} disabled={depositLocked}>
                <option value="">Select method</option>
                {PAYMENT_METHODS.map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="Balance Due ($)"><input className={inputCls} value={balanceDue(b).toFixed(2)} disabled /></Field>
          </Section>

          <Section title="Status &amp; Assignment">
            <Field label={<span className="flex items-center gap-1">Booking Status {statusLocked && <Lock size={11} />}</span>} required>
              <select className={inputCls} value={b.booking_status} onChange={(e) => set('booking_status', e.target.value)} disabled={statusLocked}>
                {STATUS_ALL
                  .filter((v) => v !== 'Completed' || b.booking_status === 'Completed')
                  .map((v) => <option key={v}>{v}</option>)}
              </select>
              {b.booking_status !== 'Completed' && (
                <p className="text-[11px] text-slate-400 mt-1">
                  &quot;Completed&quot; can&apos;t be set here - use &quot;Mark Completed&quot; on the bookings list, which requires the full balance to be settled.
                </p>
              )}
            </Field>
            <Field label="Follow-up Date"><input type="date" className={inputCls} value={b.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} disabled={formLocked} /></Field>
          </Section>

          {existing && (b.final_number_of_kids !== null && b.final_number_of_kids !== undefined || b.team_assigned) && (
            <Section title="Event Completion (Reference)" tint="#F0FBF3">
              <Field label="Booked (Tentative)"><input className={inputCls} value={b.number_of_students || '—'} disabled /></Field>
              <Field label="Final Kids Present">
                <input className={inputCls} value={b.final_number_of_kids ?? '—'} disabled />
              </Field>
              <Field label="Team Assigned" span><input className={inputCls} value={b.team_assigned || '—'} disabled /></Field>
              <p className="text-[11px] text-slate-400 col-span-2 -mt-2">
                Set when the booking was closed via &quot;Mark Completed&quot; - correct it there (or via &quot;Edit Settlement&quot;) if it needs to change.
              </p>
            </Section>
          )}

          <Section title="Notes">
            <Field label="Special Requests / Notes" span><textarea className={inputCls} rows={2} value={b.notes || ''} onChange={(e) => set('notes', e.target.value)} disabled={formLocked} /></Field>
          </Section>
        </div>

        {error && <div className="mx-6 mb-2 text-sm text-red-600">{error}</div>}

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          {existing && isApprover ? (
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
