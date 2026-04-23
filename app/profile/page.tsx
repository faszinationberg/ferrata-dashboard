"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CloudStatusBadge } from '../components/CloudStatusBadge';

export default function ProfilePage() {
  const router = useRouter();
  const { userEmail, userRole, userProfile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    if (userProfile || userEmail) {
      setFormData({
        full_name: userProfile?.full_name || '',
        phone: userProfile?.phone || '',
        email: userEmail || ''
      });
    }
  }, [userProfile, userEmail]);

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht authentifiziert");

      // 1. Profil-Daten (Name, Tel) in der profiles Tabelle aktualisieren
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // 2. Optional: E-Mail in der Auth-Tabelle aktualisieren (sendet Bestätigungs-Mail)
      if (formData.email !== userEmail) {
        const { error: authError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (authError) throw authError;
        setMessage({ type: 'success', text: 'Profil aktualisiert! Bitte bestätige die neue E-Mail Adresse.' });
      } else {
        setMessage({ type: 'success', text: 'Profil erfolgreich gespeichert!' });
      }

      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-12">
      <div className="max-w-md mx-auto px-6 pt-12">
        
        <header className="flex flex-col space-y-6 mb-12">
          <div className="flex justify-between items-center w-full">
            <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-900 text-xs font-medium flex items-center gap-2 transition-colors">
              ← Zurück
            </button>
            <CloudStatusBadge />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Mein Profil</h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-1">
              Benutzerkonto & Berechtigungen
            </p>
          </div>
        </header>

        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Rolle (Nicht änderbar) */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System-Rolle</label>
              <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">{userRole || 'Beobachter'}</span>
                <span className="text-[10px] font-medium text-blue-400 italic">Nicht änderbar</span>
              </div>
            </div>

            {/* E-Mail Adresse */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vollständiger Name</label>
              <input 
                type="text" 
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                placeholder="Name eingeben"
                className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              />
            </div>

            {/* Telefon */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefonnummer</label>
              <input 
                type="tel" 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+43 ..."
                className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-center text-xs font-bold animate-in zoom-in-95 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
            }`}>
              {message.text}
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all shadow-xl active:scale-[0.98] ${
              loading ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-black'
            }`}
          >
            {loading ? "Wird gespeichert..." : "Änderungen speichern"}
          </button>
          
        </div>
      </div>
    </main>
  );
}