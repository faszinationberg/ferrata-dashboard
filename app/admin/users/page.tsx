"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/app/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { inviteUserAction } from './actions'; // WICHTIG: Die Server Action

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  is_active: boolean;
}

export default function AdminUserManagement() {
  const { userRole, loading: authLoading } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States für das "User anlegen" Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: '', fullName: '', role: 'betreiber' });
  const [isSubmitting, setIsSubmitting] = useState(false); // Nur einmal deklarieren!

  // --- LOGIK: AUTH CHECK ---
  useEffect(() => {
    if (!authLoading && userRole !== 'developer') {
      router.replace('/dashboard');
    }
  }, [userRole, authLoading, router]);

  // --- LOGIK: DATEN LADEN ---
  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    
    if (!error && data) {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (userRole === 'developer') fetchUsers(); 
  }, [userRole]);

  // --- LOGIK: USER EINLADEN (SERVER ACTION) ---
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Wir rufen die Server Action auf, um den Service Role Key sicher zu nutzen
      const result = await inviteUserAction({
        email: newUserData.email,
        fullName: newUserData.fullName,
        role: newUserData.role
      });

      if (result.success) {
        alert("Einladung wurde versendet! Der User muss den Link in der E-Mail bestätigen.");
        setShowAddModal(false);
        setNewUserData({ email: '', fullName: '', role: 'betreiber' });
        fetchUsers(); // Liste nach Einladung aktualisieren
      } else {
        alert("Fehler: " + result.error);
      }
    } catch (err: any) {
      alert("Systemfehler: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIK: STATUS & ROLLEN UPDATES ---
  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (!error) fetchUsers();
  };

  const toggleUserStatus = async (userId: string, active: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_active: active }).eq('id', userId);
    if (!error) fetchUsers();
  };

  // --- UI RENDERING ---
  if (authLoading || userRole !== 'developer') {
    return <div className="p-20 text-center uppercase tracking-widest text-xs text-slate-400">Prüfe Berechtigung...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-light text-slate-900 tracking-tight">System<span className="font-semibold text-blue-600">.Administration</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Benutzer & Berechtigungen</p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200"
        >
          + Nutzer einladen
        </button>
      </header>
      
      {/* Tabelle */}
      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] uppercase font-black tracking-widest text-slate-400">Nutzerprofil</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black tracking-widest text-slate-400">System-Rolle</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black tracking-widest text-slate-400">Status</th>
              <th className="px-8 py-5 text-[10px] uppercase font-black tracking-widest text-slate-400 text-right">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-8 py-5">
                  <div className="font-bold text-slate-700 text-sm">{u.full_name || 'Kein Name'}</div>
                  <div className="text-[10px] font-medium text-slate-400 tracking-tight">{u.email}</div>
                </td>
                <td className="px-8 py-5">
                  <select 
                    value={u.role} 
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase px-3 py-2 outline-none focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="developer">Developer</option>
                    <option value="betreiber">Betreiber</option>
                    <option value="techniker">Techniker</option>
                    <option value="beobachter">Beobachter</option>
                  </select>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${u.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {u.is_active ? 'Aktiv' : 'Gesperrt'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                   <button 
                     onClick={() => toggleUserStatus(u.id, !u.is_active)} 
                     className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${u.is_active ? 'text-red-400 hover:bg-red-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                   >
                     {u.is_active ? 'Sperren' : 'Reaktivieren'}
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Neuen Nutzer einladen</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors text-2xl">×</button>
            </div>

            <form onSubmit={handleInviteUser} className="p-8 space-y-5">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Vollständiger Name</label>
                <input 
                  required
                  type="text"
                  value={newUserData.fullName}
                  onChange={e => setNewUserData({...newUserData, fullName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500 outline-none mt-1"
                  placeholder="z.B. Max Mustermann"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">E-Mail Adresse</label>
                <input 
                  required
                  type="email"
                  value={newUserData.email}
                  onChange={e => setNewUserData({...newUserData, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500 outline-none mt-1"
                  placeholder="name@beispiel.de"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">System-Rolle</label>
                <select 
                  value={newUserData.role}
                  onChange={e => setNewUserData({...newUserData, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none mt-1"
                >
                  <option value="betreiber">Betreiber</option>
                  <option value="techniker">Techniker</option>
                  <option value="beobachter">Beobachter</option>
                  <option value="developer">Developer</option>
                </select>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Einladung wird gesendet...' : 'Einladung jetzt senden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}