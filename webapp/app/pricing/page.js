'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export default function PricingPage() {
  const { profile } = useAuth();
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newRate, setNewRate] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('package_rates').select('*').order('package_name');
    setRates(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateRate(id, rate) {
    setError('');
    const { error: err } = await supabase.from('package_rates').update({ rate, updated_by: profile.id }).eq('id', id);
    if (err) setError(err.message);
    load();
  }

  async function addPackage() {
    setError('');
    if (!newName.trim() || newRate === '') { setError('Enter both a name and a rate.'); return; }
    const { error: err } = await supabase.from('package_rates').insert({
      package_name: newName.trim(),
      rate: parseFloat(newRate),
      updated_by: profile.id,
    });
    if (err) { setError(err.message); return; }
    setNewName(''); setNewRate('');
    load();
  }

  async function removePackage(id) {
    setError('');
    const { error: err } = await supabase.from('package_rates').delete().eq('id', id);
    if (err) setError(err.message);
    load();
  }

  if (profile?.role !== 'approver') {
    return (
      <AppShell>
        <div className="p-8 text-sm text-slate-500">Only approvers can manage pricing.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="font-display text-xl font-bold text-slate-900">Package Pricing</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Rate per student. Changes apply immediately to the booking form for everyone.
        </p>
      </header>
      <div className="p-8">
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
              <DollarSign size={14} /> Package rates
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-400">Loading…</div>
            ) : rates.length === 0 ? (
              <div className="p-6 text-sm text-slate-400">No packages yet. Add one on the right.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rates.map((r) => (
                  <div key={r.id} className="flex items-center justify-between px-5 py-3">
                    <span className="text-sm font-medium text-slate-800">{r.package_name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">AED</span>
                        <input
                          type="number"
                          defaultValue={r.rate}
                          onBlur={(e) => {
                            const v = parseFloat(e.target.value);
                            if (!isNaN(v) && v !== r.rate) updateRate(r.id, v);
                          }}
                          className="focus-ring w-24 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-right"
                        />
                        <span className="text-xs text-slate-400">/ student</span>
                      </div>
                      <button onClick={() => removePackage(r.id)} className="text-slate-300 hover:text-red-500 ml-1">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
            <div className="flex items-center gap-2 mb-4"><Plus size={16} className="text-slate-500" /><h3 className="font-display font-semibold text-slate-900">Add a package</h3></div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Package name</label>
            <input className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Package D" />
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Rate per student (AED)</label>
            <input type="number" className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3" value={newRate} onChange={(e) => setNewRate(e.target.value)} />
            <button onClick={addPackage} className="btn-primary w-full py-2 rounded-lg text-sm font-semibold">Add package</button>
            <p className="text-[11px] text-slate-400 mt-3">
              &quot;Special Offer&quot; is always available on the booking form as a manual, no-fixed-rate option and doesn&apos;t need to be added here.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
