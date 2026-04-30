"use client";

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Erfolg: Weiterleitung zum Dashboard
      router.push('/dashboard?message=Passwort erfolgreich gesetzt');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white rounded- shadow-2xl shadow-slate-200 border border-slate-100 p-10 max-w-md w-full">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-light text-slate-900 tracking-tight">System<span className="font-semibold text-blue-600">.Setup</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">Lege dein persönliches Passwort fest</p>
        </header>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Neues Passwort</label>
            <input 
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm focus:bg-white focus:border-blue-500 outline-none transition-all mt-1"
            />
          </div>

          {error && <p className="text-red-500 text-[10px] font-bold uppercase">{error}</p>}

          <button 
            type="submit"
            disabled={loading || password.length < 6}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
          >
            {loading ? 'Wird gespeichert...' : 'Account aktivieren'}
          </button>
        </form>
      </div>
    </div>
  );
}