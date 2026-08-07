'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/AuthProvider';

export default function LoginPage() {
  const { session } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  async function handleSignIn(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) setError(err.message);
  }

  async function handleSignUp(e) {
    e.preventDefault();
    setError(''); setInfo(''); setBusy(true);
    if (!name.trim()) { setBusy(false); setError('Enter your name.'); return; }
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim() } },
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setInfo('Account created. If email confirmation is enabled on your Supabase project, check your inbox before signing in.');
    setMode('signin');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm p-7">
        <div className="flex items-center gap-3 mb-5">
          <Image src="/logos/playo.png" alt="Playo" width={70} height={30} style={{ objectFit: 'contain', height: '30px', width: 'auto' }} />
          <Image src="/logos/louna.png" alt="Louna Land (Oh Chateau)" width={60} height={30} style={{ objectFit: 'contain', height: '30px', width: 'auto' }} />
        </div>
        <div className="w-10 h-10 rounded-lg bg-navy flex items-center justify-center mb-4">
          <ShieldCheck size={18} className="text-white" />
        </div>
        <h1 className="font-display text-lg font-bold text-slate-900 mb-1">
          {mode === 'signin' ? 'Sign in' : 'Create your account'}
        </h1>
        <p className="text-sm text-slate-500 mb-5">
          {mode === 'signin'
            ? 'School events booking control.'
            : 'The first person to sign up becomes an Approver. Everyone after that starts as an Agent.'}
        </p>

        <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
          {mode === 'signup' && (
            <>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Your name</label>
              <input className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3" value={name} onChange={(e) => setName(e.target.value)} />
            </>
          )}
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
          <input type="email" required className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-3" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Password</label>
          <input type="password" required minLength={6} className="focus-ring w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-4" value={password} onChange={(e) => setPassword(e.target.value)} />

          {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
          {info && <div className="text-sm text-emerald-600 mb-3">{info}</div>}

          <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setInfo(''); }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-700 mt-4"
        >
          {mode === 'signin' ? "New team member? Create an account" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
