'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthProvider';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session === undefined) return; // still checking
    router.replace(session ? '/dashboard' : '/login');
  }, [session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-400 font-medium">Loading…</div>
    </div>
  );
}
