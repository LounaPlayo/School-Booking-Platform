'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import AppShell from '../../components/AppShell';
import { useAuth } from '../../lib/AuthProvider';
import { supabase } from '../../lib/supabaseClient';

export default function TeamPage() {
  const { profile } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    setTeam(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function setRole(id, role) {
    setError('');
    const { error: err } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (err) setError(err.message);
    load();
  }

  if (profile?.role !== 'approver') {
    return (
      <AppShell>
        <div className="p-8 text-sm text-slate-500">Only approvers can view the team page.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="bg-white border-b border-slate-200 px-8 py-5">
        <h1 className="font-display text-xl font-bold text-slate-900">Team Directory</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          New team members appear here automatically once they create an account on the sign-in page.
        </p>
      </header>
      <div className="p-8">
        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-w-xl">
          <div className="px-5 py-3 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <Users size={14} /> Team members
          </div>
          {loading ? (
            <div className="p-6 text-sm text-slate-400">Loading…</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {team.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                      {m.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800">
                        {m.name}{m.id === profile.id && <span className="text-slate-400 font-normal"> (you)</span>}
                      </div>
                    </div>
                  </div>
                  <select
                    value={m.role}
                    onChange={(e) => setRole(m.id, e.target.value)}
                    className="focus-ring text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                  >
                    <option value="agent">Agent</option>
                    <option value="approver">Approver</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
