"use client";

import { useState, Suspense } from 'react';
import { createClient } from '../../lib/supabase'; 
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const supabase = createClient(); 
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');

  // --- LOGIN LOGIK ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        const target = redirectedFrom || (profile?.role === 'technician' ? '/technician' : '/dashboard');
        
        await new Promise((resolve) => setTimeout(resolve, 100));
        window.location.href = window.location.origin + target;
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      setLoading(false);
    }
  };

  // --- PASSWORT VERGESSEN LOGIK ---
  const handleForgotPassword = async () => {
    if (!email) {
      setMessage({ type: 'error', text: "Bitte gib zuerst deine E-Mail-Adresse ein." });
      return;
    }
    
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });

      if (error) throw error;
      
      setMessage({ type: 'success', text: "Reset-Link wurde an deine E-Mail gesendet!" });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm animate-in fade-in zoom-in-95 duration-500">
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-light tracking-tight text-slate-900">
          ferrata<span className="font-semibold text-blue-600">.report</span>
        </h1>
        <p className="text-slate-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-black">
          Interner Zugang
        </p>
      </header>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">
            E-Mail
          </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all text-slate-900"
            placeholder="name@beispiel.de"
            required
            autoComplete="email"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 block">
              Passwort
            </label>
            <button 
              type="button"
              onClick={handleForgotPassword}
              className="text-[9px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-tighter mr-2 transition-colors"
            >
              Passwort vergessen?
            </button>
          </div>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all text-slate-900"
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        {/* Status-Meldungen (Erfolg oder Fehler) */}
        {message && (
          <div className={`text-[9px] font-bold p-3 rounded-xl text-center uppercase tracking-wider border animate-in fade-in slide-in-from-top-1 ${
            message.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}>
            {message.text}
          </div>
        )}

        {redirectedFrom && !message && (
          <div className="bg-blue-50 text-blue-600 text-[9px] font-bold p-3 rounded-xl text-center uppercase tracking-wider border border-blue-100">
            Anmeldung erforderlich für: <br/> {redirectedFrom}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all disabled:bg-slate-200 active:scale-[0.98]"
        >
          {loading ? 'Authentifizierung...' : 'Anmelden'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <Suspense fallback={<div className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Laden...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}