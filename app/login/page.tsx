"use client";
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Login fehlgeschlagen: " + error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-light tracking-tight text-slate-900">
            ferrata<span className="font-semibold">.report</span>
          </h1>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Interner Zugang</p>
        </header>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">E-Mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
              placeholder="name@beispiel.de"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-1 block">Passwort</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 transition-all disabled:bg-slate-200"
          >
            {loading ? 'Authentifizierung...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </main>
  );
}