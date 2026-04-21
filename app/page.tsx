"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { supabase } from '../lib/supabase';

import { CloudStatusBadge } from '@/app/components/CloudStatusBadge';
import { useAuth } from '@/app/hooks/useAuth';

interface Ferrata {
  id: string;
  name: string;
  region: string;
  difficulty: string;
  status: string;
  topo_url: string;
}

interface Report {
  id: string;
  ferrata_id: string;
  verified: boolean;
}

export default function Home() {
  const router = useRouter(); 

  const [ferratas, setFerratas] = useState<Ferrata[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopo, setSelectedTopo] = useState<Ferrata | null>(null);

  // States für neuen Klettersteig
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFerrata, setNewFerrata] = useState({ name: '', region: '', difficulty: 'C' });

//  const [userEmail, setUserEmail] = useState<string | null>(null);
 // const [userRole, setUserRole] = useState<string | null>(null);

  const { userRole } = useAuth();

  async function loadData() {
    setLoading(true);
    const { data: ferrataData } = await supabase.from('ferratas').select('*').order('name');
    const { data: reportData } = await supabase.from('reports').select('id, ferrata_id, verified').eq('resolved', false);

    if (ferrataData) setFerratas(ferrataData);
    if (reportData) setReports(reportData);
    setLoading(false);
  }

  useEffect(() => {
  async function checkUserAndLoadData() {
    // 1. Session prüfen
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push('/login');
      return;
    }

    // 2. WICHTIG: Wenn Session ok, Daten laden!
    // Erst loadData() setzt setLoading(false) am Ende
    await loadData();
  }
  
  checkUserAndLoadData();
}, [router]); // router bleibt hier die einzige Dependency


  const handleCreateFerrata = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Kleiner Schutz: Nicht doppelt klicken
    if (loading) return;

    try {
      const { data, error } = await supabase
        .from('ferratas')
        .insert([
          { 
            name: newFerrata.name, 
            region: newFerrata.region, 
            difficulty: newFerrata.difficulty,
            status: 'unknown' // Standardwert
          }
        ])
        .select(); // Hilft Supabase, den Erfolg zu bestätigen

      if (error) {
        console.error("Supabase Error:", error.message);
        alert("Fehler: " + error.message);
        return;
      }

      // Erfolg: Modal schließen, Daten neu laden
      setShowAddModal(false);
      setNewFerrata({ name: '', region: '', difficulty: 'C' });
      await loadData(); // Wichtig: Liste im Hintergrund aktualisieren
      
    } catch (err) {
      console.error("Runtime Error:", err);
    }
  };

  const getStats = (id: string) => {
    const relevant = reports.filter(r => r.ferrata_id === id);
    return {
      total: relevant.length,
      unverified: relevant.filter(r => !r.verified).length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-400 tracking-widest uppercase">System wird geladen</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-blue-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* HEADER */}
        <header className="mb-16 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-slate-900">
              ferrata<span className="font-semibold">.report</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 tracking-wide font-light">Monitoring & Documentation — G. Ausserhofer</p>
          </div>
          
          <CloudStatusBadge />

        </header>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* NEU: ADD FERRATA CARD */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="group bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-4 min-h-[300px]"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
              <span className="text-2xl font-light">+</span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">Neuen Steig anlegen</span>
          </button>

          {ferratas.map((f) => {
            const stats = getStats(f.id);
            const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
              open: { label: 'Geöffnet', color: 'text-emerald-500', dot: 'bg-emerald-500' },
              closed: { label: 'Gesperrt', color: 'text-red-500', dot: 'bg-red-500' },
              maintenance: { label: 'Wartung', color: 'text-orange-500', dot: 'bg-orange-500' },
              winter: { label: 'Winterpause', color: 'text-blue-500', dot: 'bg-blue-500' },
              unknown: { label: 'Unbekannt', color: 'text-slate-400', dot: 'bg-slate-300' }
            };

            const currentStatus = statusConfig[f.status?.toLowerCase()] || statusConfig.unknown;

            return (
              <div key={f.id} className="group bg-white border border-slate-200/60 rounded-2xl p-6 transition-all duration-300 hover:border-blue-200 hover:shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.1em]">{f.region}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <div className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot} ${f.status === 'open' || f.status === 'maintenance' ? 'animate-pulse' : ''}`}></div>
                        <span className={`text-[9px] font-bold uppercase tracking-tight ${currentStatus.color}`}>
                          {currentStatus.label}
                        </span>
                      </div>
                      {stats.unverified > 0 && (
                        <div className="h-2 w-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-medium text-slate-800 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                    {f.name}
                  </h2>
                  <div className="flex items-center gap-3 mb-8">
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-slate-50 border border-slate-100 rounded text-slate-500 tracking-wider">
                      CAT {f.difficulty}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Link 
                    href={`/ferrata/${f.id}/maintenance`}
                    className="w-full py-3 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-2 border bg-white text-slate-600 border-slate-100 hover:border-orange-200 hover:text-orange-600 shadow-sm"
                  >
                    🛠️ WARTUNG & FEED
                  </Link>
                  <Link 
                    href={`/ferrata/${f.id}`}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl text-[11px] font-medium hover:bg-blue-600 transition-all flex items-center justify-center gap-2 tracking-wide"
                  >
                    📄 STAMMDATEN & DOCS
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* CREATE MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Neues Objekt erfassen</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors text-2xl">×</button>
              </div>

              {/* Wichtig: Das onSubmit gehört an das Form-Tag */}
              <form onSubmit={handleCreateFerrata} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-1">Bezeichnung</label>
                    <input 
                      required
                      value={newFerrata.name}
                      onChange={e => setNewFerrata({...newFerrata, name: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-sm font-medium focus:bg-white focus:border-blue-500 outline-none transition-all"
                      placeholder="Name des Klettersteigs"
                    />
                  </div>
                  {/* ... andere Felder ... */}
                </div>

                <button 
                  type="submit" 
                  disabled={!newFerrata.name}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:bg-slate-200 disabled:shadow-none"
                >
                  {loading ? 'Wird gespeichert...' : 'Klettersteig anlegen'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EXISTING TOPO MODAL */}
        {selectedTopo && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-12" onClick={() => setSelectedTopo(null)}>
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-full overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">{selectedTopo.name} — Topo</span>
                <button onClick={() => setSelectedTopo(null)} className="text-slate-400 hover:text-slate-900 transition-colors text-xl p-2">✕</button>
              </div>
              <div className="overflow-y-auto p-2 bg-slate-50/50">
                <img src={selectedTopo.topo_url} className="w-full h-auto rounded-lg" alt="Topo" />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}