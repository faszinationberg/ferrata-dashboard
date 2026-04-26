"use client";

import { useState, Suspense } from 'react';
import { createClient } from '../../lib/supabase'; 
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const supabase = createClient(); 
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // 1. Anmeldung via SSR-Client
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (authError) throw authError;

      if (authData?.user) {
        // 2. Rolle abrufen
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .maybeSingle();

        const target = redirectedFrom || (profile?.role === 'technician' ? '/technician' : '/dashboard');
        
        // 3. Cookie-Synchronisation abwarten
        // Eine kurze Verzögerung hilft dem Browser, die Cookies stabil zu speichern
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 4. Harter Redirect via href
        // window.location.href erzwingt das Mitsenden der neuen Cookies an die Middleware
        window.location.href = window.location.origin + target;
      }
    } catch (err: any) {
      alert("Fehler: " + err.message);
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
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">
            Passwort
          </label>
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

        {redirectedFrom && (
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