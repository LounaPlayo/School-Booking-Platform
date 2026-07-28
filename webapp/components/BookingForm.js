'use client';

import { useState } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import {
  VENUES, EVENT_TYPES, EVENT_TIMES, STATUS_ALL, DEPOSIT_STATUSES,
  isStatusLocked, isDepositLocked, isSealed, balanceDue,
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

export default function BookingForm({ booking, existing, profile, packageRates, onCancel, onSave, onDeleteRequest, namesById }) {
  const [b, setB] = useState(booking);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isApprover = profile.role === 'approver';
  const statusLocked = existing && isStatusLocked(booking) && !isApprover;
  const depositLocked = existing && isDepositLocked(booking) && !isApprover;
  const overriding = existing && (isStatusLocked(booking) || isDepositLocked(booking)) && isApprover;
  const sealed = existing && isSealed(booking);
  const rateMap = Object.fromEntries((packageRates || []).map((r) => [r.package_name, r.rate]));
  const packageOptions = [...(packageRates || []).map((r) => r.package_name), 'Special Offer'];

  function set(k, v) {
    setB((prev) => {
      const next = { ...prev, [k]: v };

      // Selecting Deposit Received directly confirms the booking too -
      // the two should never be out of sync, since "sealed" (and
      // therefore delete-proof) requires both to be true together.
      if (k === 'deposit_status' && v === 'Received') {
        next.booking_status = 'Confirmed';
      }

      // Packages with a set rate auto-price against the student count.
      // Special Offer has no fixed rate - it's left for manual entry and
      // should be confirmed with an approver before the booking is finalized.
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
      <div className="bg-white rounded-2xl w-full max-w-2xl overflow-y-auto" style={{ maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{existing ? 'Edit Booking' : 'New Booking'}</h2>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {sealed && (
          <div className="mx-6 mt-4 seal-banner border text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <Lock size={15} /> This booking is confirmed with deposit received. Deletion is permanently blocked for everyone, including approvers.
          </div>
        )}
        {overriding && !sealed && (
          <div className="mx-6 mt-4 override-banner border text-sm px-4 py-3 rounded-lg flex items-center gap-2">
            <ShieldCheck size={15} /> You&apos;re editing a locked field as an approver. This is recorded.
          </div>
        )}
        {existing && (b.created_by || b.updated_by) && namesById && (
          <div className="mx-6 mt-3 text-xs text-slate-400 flex flex-wrap gap-x-4">
            {b.created_by && <span>Created by {namesById[b.created_by] || 'Unknown'}</span>}
            {b.updated_by && <span>Last edited by {namesById[b.updated_by] || 'Unknown'}</span>}
            {b.approved_by && <span>Confirmed by {namesById[b.approved_by] || 'Unknown'}</span>}
          </div>
        )}

        <div className="p-6 grid grid-cols-2 gap-4">
          <Field label="Venue">
            <select className={inputCls} value={b.venue} onChange={(e) => set('venue', e.target.value)}>
              {VENUES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Event Type">
            <select className={inputCls} value={b.event_type || ''} onChange={(e) => set('event_type', e.target.value)}>
              {EVENT_TYPES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="School / Nursery Name" span>
            <input className={inputCls} value={b.school_name || ''} onChange={(e) => set('school_name', e.target.value)} placeholder="e.g. Kids World Nursery" />
          </Field>
          <Field label="Contact Person"><input className={inputCls} value={b.contact_person || ''} onChange={(e) => set('contact_person', e.target.value)} /></Field>
          <Field label="Phone"><input className={inputCls} value={b.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Email" span><input className={inputCls} value={b.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Event Date"><input type="date" className={inputCls} value={b.event_date || ''} onChange={(e) => set('event_date', e.target.value)} /></Field>
          <Field label="Event Time">
            <select className={inputCls} value={b.event_time || ''} onChange={(e) => set('event_time', e.target.value)}>
              <option value="">Select a time</option>
              {EVENT_TIMES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Grade Level / Age"><input className={inputCls} value={b.grade_level || ''} onChange={(e) => set('grade_level', e.target.value)} /></Field>
          <Field label="# Students"><input type="number" className={inputCls} value={b.number_of_students || ''} onChange={(e) => set('number_of_students', e.target.value)} /></Field>
          <Field label="# Chaperones"><input type="number" className={inputCls} value={b.number_of_chaperones || ''} onChange={(e) => set('number_of_chaperones', e.target.value)} /></Field>
          <Field label="Package">
            <select className={inputCls} value={b.package_selected || ''} onChange={(e) => set('package_selected', e.target.value)}>
              {packageOptions.map((v) => <option key={v}>{v}</option>)}
            </select>
            {b.package_selected === 'Special Offer' && (
              <p className="text-[11px] text-amber-700 mt-1">Special pricing - enter manually and confirm with an approver before finalizing.</p>
            )}
          </Field>
          <Field label="Total Price (AED)"><input type="number" className={inputCls} value={b.total_price || ''} onChange={(e) => set('total_price', e.target.value)} /></Field>
          <Field label="Deposit Required (AED)"><input type="number" className={inputCls} value={b.deposit_required || ''} onChange={(e) => set('deposit_required', e.target.value)} disabled={depositLocked} /></Field>
          <Field label={<span className="flex items-center gap-1">Deposit Status {depositLocked && <Lock size={11} />}</span>}>
            <select className={inputCls} value={b.deposit_status} onChange={(e) => set('deposit_status', e.target.value)} disabled={depositLocked}>
              {DEPOSIT_STATUSES.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Deposit Amount Received"><input type="number" className={inputCls} value={b.deposit_amount_received || ''} onChange={(e) => set('deposit_amount_received', e.target.value)} disabled={depositLocked} /></Field>
          <Field label="Deposit Date"><input type="date" className={inputCls} value={b.deposit_date || ''} onChange={(e) => set('deposit_date', e.target.value)} disabled={depositLocked} /></Field>
          <Field label="Balance Due (AED)"><input className={inputCls} value={balanceDue(b).toFixed(2)} disabled /></Field>
          <Field label={<span className="flex items-center gap-1">Booking Status {statusLocked && <Lock size={11} />}</span>}>
            <select className={inputCls} value={b.booking_status} onChange={(e) => set('booking_status', e.target.value)} disabled={statusLocked}>
              {STATUS_ALL.map((v) => <option key={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="Consent Forms Received">
            <select className={inputCls} value={b.consent_forms_received || 'No'} onChange={(e) => set('consent_forms_received', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </Field>
          <Field label="Team Assigned" span><input className={inputCls} value={b.team_assigned || ''} onChange={(e) => set('team_assigned', e.target.value)} /></Field>
          <Field label="Follow-up Date"><input type="date" className={inputCls} value={b.follow_up_date || ''} onChange={(e) => set('follow_up_date', e.target.value)} /></Field>
          <Field label="Notes" span><textarea className={inputCls} rows={2} value={b.notes || ''} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>

        {error && <div className="mx-6 mb-2 text-sm text-red-600">{error}</div>}

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between rounded-b-2xl">
          {existing && !sealed ? (
            <button onClick={() => onDeleteRequest(b)} className="text-sm font-semibold text-red-500 hover:text-red-600">Delete booking</button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
