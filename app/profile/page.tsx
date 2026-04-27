"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CloudStatusBadge } from '../components/CloudStatusBadge';

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { userEmail, userRole, userProfile, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // States für Profildaten
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: ''
  });

  // States für Passwort (jetzt korrekt innerhalb der Komponente)
  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (userProfile || userEmail) {
      setFormData({
        full_name: userProfile?.full_name || '',
        phone: userProfile?.phone || '',
        email: userEmail || ''
      });
    }
  }, [userProfile, userEmail]);

  // LOGIK 1: Passwort aktualisieren
  const handleUpdatePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Die Passwörter stimmen nicht überein.' });
      return;
    }
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Passwort erfolgreich aktualisiert!' });
      setPasswordData({ new_password: '', confirm_password: '' });
      setShowPasswordSection(false);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // LOGIK 2: Profil speichern
  const handleSave = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Nicht authentifiziert");

      // 1. Profil-Daten aktualisieren
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
        })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // 2. E-Mail aktualisieren
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
          
          {/* CONTAINER 1: Stammdaten */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System-Rolle</label>
              <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <span className="text-sm font-bold text-blue-700 uppercase tracking-wider">{userRole || 'Beobachter'}</span>
                <span className="text-[10px] font-medium text-blue-400 italic">Nicht änderbar</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-Mail Adresse</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
              />
            </div>

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

          {/* CONTAINER 2: Passwort */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sicherheit</label>
                <h3 className="text-sm font-bold text-slate-700">Passwort ändern</h3>
              </div>
              <button 
                onClick={() => setShowPasswordSection(!showPasswordSection)}
                className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                {showPasswordSection ? 'Abbrechen' : 'Bearbeiten'}
              </button>
            </div>

            {showPasswordSection && (
              <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Neues Passwort</label>
                  <input 
                    type="password" 
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                    placeholder="Mind. 6 Zeichen"
                    className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Passwort bestätigen</label>
                  <input 
                    type="password" 
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                    placeholder="Passwort wiederholen"
                    className="w-full bg-[#fcfcfc] border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-blue-500 focus:bg-white outline-none transition-all shadow-inner"
                  />
                </div>

                <button 
                  onClick={handleUpdatePassword}
                  disabled={loading || !passwordData.new_password}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none"
                >
                  Passwort jetzt aktualisieren
                </button>
              </div>
            )}
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