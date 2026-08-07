'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { TrendingUp, School, Users, LogOut, Calendar, DollarSign } from 'lucide-react';
import { useAuth } from '../lib/AuthProvider';

export default function AppShell({ children }) {
  const { session, profile, loadingProfile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null) router.replace('/login');
  }, [session, router]);

  if (session === undefined || session === null || loadingProfile || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 font-medium">Loading…</div>
      </div>
    );
  }

  const nav = [
    { href: '/dashboard', label: 'Dashboard', icon: TrendingUp },
    { href: '/bookings', label: 'Bookings', icon: School },
    { href: '/calendar', label: 'Calendar', icon: Calendar },
  ];
  if (profile.role === 'approver') {
    nav.push({ href: '/team', label: 'Team', icon: Users });
    nav.push({ href: '/pricing', label: 'Pricing', icon: DollarSign });
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-navy text-white flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-white/95 rounded-lg p-1.5 flex items-center justify-center" style={{ height: '34px' }}>
              <Image src="/logos/playo.png" alt="Playo" width={60} height={26} style={{ objectFit: 'contain', height: '26px', width: 'auto' }} />
            </div>
            <div className="bg-white/95 rounded-lg p-1.5 flex items-center justify-center" style={{ height: '34px' }}>
              <Image src="/logos/louna.png" alt="Louna Land (Oh Chateau)" width={50} height={26} style={{ objectFit: 'contain', height: '26px', width: 'auto' }} />
            </div>
          </div>
          <div className="font-display text-sm font-bold tracking-tight mt-2">Booking Control</div>
          <div className="text-xs text-white/50 mt-0.5">School Events</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2.5 transition ${
                pathname === item.href ? 'nav-active' : 'nav-inactive'
              }`}
            >
              <item.icon size={16} /> {item.label}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-semibold shrink-0">
              {profile.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{profile.name}</div>
              <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${profile.role === 'approver' ? 'approver-chip' : 'agent-chip'}`}>
                {profile.role === 'approver' ? 'Approver' : 'Agent'}
              </span>
            </div>
          </div>
          <button onClick={signOut} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 transition">
            <LogOut size={13} /> Sign out
          </button>
          <div className="text-[11px] text-white/40 leading-relaxed mt-3 px-2">
            Confirmed or Completed bookings can&apos;t be deleted by anyone, enforced by the database itself.
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
