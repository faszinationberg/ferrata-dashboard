"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export function CloudStatusBadge() {
  const router = useRouter();
  const supabase = createClient();
  const { userEmail, userRole, userProfile, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout Fehler:', err);
    }
  };

  if (loading) return <div className="h-10 w-20 md:w-32 bg-slate-50 animate-pulse rounded-full" />;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 bg-white border border-slate-100 rounded-full shadow-sm hover:border-blue-200 transition-all active:scale-[0.98] group"
      >
        <div className="flex flex-col leading-none text-left">
          {/* ROLLE: Nur ab Tablet (sm) sichtbar */}
          <span className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-widest">
            {userRole ? userRole : 'Rolle...'}
          </span>
          {/* NAME: Wird auf Mobile bei zu langen Namen abgekürzt */}
          <span className="text-[10px] font-bold text-slate-700 max-w-[80px] md:max-w-none truncate">
            {userProfile?.full_name ? userProfile.full_name : (userEmail ? userEmail.split('@')[0] : 'Gast')}
          </span>
        </div>

        {/* TRENNER: Nur ab Tablet sichtbar */}
        <div className="hidden sm:block h-4 w-[1px] bg-slate-100 mx-1"></div>
        
        <div className="flex items-center gap-2">
          {/* TEXT CLOUD LIVE: Nur ab Desktop (md) sichtbar */}
          <span className="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            Cloud Live
          </span>
          {/* STATUS PUNKT: Immer sichtbar */}
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${userRole === 'developer' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
          {/* PFEIL: Immer sichtbar */}
          <span className={`text-[8px] text-slate-300 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[110] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
            <div className="px-4 py-2 border-b border-slate-50 mb-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Angemeldet als</p>
              <p className="text-[10px] font-medium text-slate-500 truncate">{userEmail}</p>
              {/* Auf Mobile zeigen wir die Rolle hier im Menü an, da sie im Badge fehlt */}
              <p className="sm:hidden text-[8px] font-bold text-blue-600 uppercase mt-1">{userRole}</p>
            </div>

            <button 
              onClick={() => { router.push('/profile'); setIsOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2"
            >
              <span>👤</span> Profil bearbeiten
            </button>

            <button 
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <span>🚪</span> Abmelden
            </button>
          </div>
        </>
      )}
    </div>
  );
}