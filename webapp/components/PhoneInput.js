'use client';

import { COUNTRY_CODES } from '../lib/constants';

function parsePhone(value) {
  if (!value) return { code: '+961', number: '' };
  const match = COUNTRY_CODES.find((c) => value.startsWith(c.code + ' '));
  if (match) return { code: match.code, number: value.slice(match.code.length + 1) };
  return { code: '+961', number: value };
}

// Stores/returns a single combined string like "+961 71 234 567" via
// value/onChange - the country code and local number are just how it's
// presented and edited.
export default function PhoneInput({ value, onChange, disabled }) {
  const { code, number } = parsePhone(value);

  function handleCodeChange(newCode) {
    onChange(`${newCode} ${number}`.trim());
  }
  function handleNumberChange(newNumber) {
    onChange(`${code} ${newNumber}`.trim());
  }

  return (
    <div className="flex gap-1.5 w-full min-w-0">
      <select
        className="focus-ring text-sm border border-slate-200 rounded-lg pl-1.5 pr-0.5 shrink-0 disabled:bg-slate-50 disabled:text-slate-400"
        style={{ width: '92px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        disabled={disabled}
        title={COUNTRY_CODES.find((c) => c.code === code)?.name}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code + c.name} value={c.code}>{c.name} ({c.code})</option>
        ))}
      </select>
      <input
        type="tel"
        className="focus-ring flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400"
        value={number}
        onChange={(e) => handleNumberChange(e.target.value)}
        disabled={disabled}
        placeholder="71 234 567"
      />
    </div>
  );
}
