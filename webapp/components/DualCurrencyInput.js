'use client';

import { useState } from 'react';
import { LBP_RATE } from '../lib/constants';

const inputCls = 'focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400';

// The value passed in/out (via `value`/`onChange`) is ALWAYS USD - this
// component just lets the person typing choose to enter it in LBP
// instead, converting immediately using the fixed rate. Nothing outside
// this component ever sees or stores an LBP number.
export default function DualCurrencyInput({ value, onChange, disabled }) {
  const [mode, setMode] = useState('USD');

  const displayValue =
    value === '' || value === undefined || value === null
      ? ''
      : mode === 'USD'
      ? value
      : Math.round(parseFloat(value) * LBP_RATE);

  function handleChange(raw) {
    if (raw === '') {
      onChange('');
      return;
    }
    const num = parseFloat(raw);
    if (Number.isNaN(num)) return;
    onChange(mode === 'USD' ? raw : (num / LBP_RATE).toString());
  }

  function handleModeChange(newMode) {
    setMode(newMode);
  }

  return (
    <div>
      <div className="flex gap-1.5">
        <input
          type="number"
          className={inputCls}
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          disabled={disabled}
        />
        <select
          className="focus-ring text-xs border border-slate-200 rounded-lg px-2 disabled:bg-slate-50 disabled:text-slate-400"
          value={mode}
          onChange={(e) => handleModeChange(e.target.value)}
          disabled={disabled}
        >
          <option value="USD">$</option>
          <option value="LBP">LBP</option>
        </select>
      </div>
      {mode === 'LBP' && value !== '' && value !== undefined && (
        <p className="text-[11px] text-slate-400 mt-1">= ${parseFloat(value || 0).toFixed(2)}</p>
      )}
    </div>
  );
}
