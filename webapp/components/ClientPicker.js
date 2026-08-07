'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, Check } from 'lucide-react';

const inputCls = 'focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg disabled:bg-slate-50 disabled:text-slate-400';

// `clients` is the full list fetched once by the parent. `value` is the
// current school_name text (what's actually stored on the booking).
// onSelectClient fires with a full client record when one is chosen from
// the list, so the parent can auto-fill contact/phone/email from it.
// onChangeName fires on every keystroke so the parent can still treat
// this as a free-text field for brand-new clients.
export default function ClientPicker({ clients, value, onChangeName, onSelectClient, disabled }) {
  const [open, setOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = (value || '').trim().toLowerCase();
  const matches = query
    ? clients.filter((c) => c.name.toLowerCase().includes(query)).slice(0, 8)
    : [];
  const exactMatch = clients.find((c) => c.name.toLowerCase() === query);

  function pick(client) {
    setSelectedClientId(client.id);
    onSelectClient(client);
    setOpen(false);
  }

  function handleTyping(v) {
    setSelectedClientId(null);
    onChangeName(v);
    setOpen(true);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className={`${inputCls} pl-8`}
          value={value || ''}
          onChange={(e) => handleTyping(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search or type a new school / nursery name"
          disabled={disabled}
        />
        {selectedClientId && (
          <span title="Linked to an existing client" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600">
            <Check size={14} />
          </span>
        )}
      </div>

      {open && !disabled && query && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {matches.length > 0 ? (
            matches.map((c) => (
              <button
                key={c.id}
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center justify-between"
              >
                <span className="text-slate-800">{c.name}</span>
                {c.phone && <span className="text-xs text-slate-400 font-mono">{c.phone}</span>}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-xs text-slate-400">No matching client yet.</div>
          )}
          {!exactMatch && query && (
            <div className="px-3 py-2 text-xs text-emerald-700 border-t border-slate-100 flex items-center gap-1.5">
              <UserPlus size={13} /> Will create &quot;{value}&quot; as a new client when saved.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
