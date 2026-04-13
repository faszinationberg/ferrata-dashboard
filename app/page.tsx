"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

// Typen für TypeScript
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
  type: string;
  description: string;
  created_at: string;
  verified: boolean;
}

export default function Home() {
  const [ferratas, setFerratas] = useState<Ferrata[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopo, setSelectedTopo] = useState<Ferrata | null>(null);

  // DATEN AUS SUPABASE LADEN
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      // 1. Klettersteige laden
      const { data: ferrataData } = await supabase
        .from('ferratas')
        .select('*')
        .order('name');

      // 2. Alle offenen Meldungen laden (Feed)
      const { data: reportData } = await supabase
        .from('reports')
        .select('*')
        .eq('resolved', false) // Nur ungelöste zeigen
        .order('created_at', { ascending: false });

      if (ferrataData) setFerratas(ferrataData);
      if (reportData) setReports(reportData);
      setLoading(false);
    }

    loadData();
  }, []);

  // Hilfsfunktion: Zählt Meldungen pro Klettersteig
  const getStats = (id: string) => {
    const relevant = reports.filter(r => r.ferrata_id === id);
    return {
      total: relevant.length,
      unverified: relevant.filter(r => !r.verified).length
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="font-black italic text-blue-600 animate-pulse text-2xl">Lade Dashboard...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic leading-none">ferrata.report</h1>
            <p className="text-slate-500 text-lg mt-3 font-medium">Zentrales Monitoring & Live-Feed - Guenther AUSSERHOFER</p>
          </div>
          <div className="hidden md:block bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-2 text-center">Cloud Status</p>
            <p className="text-emerald-500 font-bold flex items-center gap-2 leading-none">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Verbunden mit Supabase
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          
          {/* LINKER BEREICH: KLETTERSTEIG-KARTEN */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8">
            {ferratas.map((f) => {
              const stats = getStats(f.id);
              return (
                <div key={f.id} className="bg-white rounded-[3rem] shadow-sm border border-slate-200 p-8 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                  
                  {/* Status-Badges oben rechts */}
                  <div className="absolute top-8 right-8 flex gap-2">
                    {stats.unverified > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-xl animate-bounce shadow-lg shadow-amber-200">
                        {stats.unverified} NEU
                      </span>
                    )}
                    {stats.total > 0 && (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-black px-3 py-1 rounded-xl border border-slate-200">
                        {stats.total} MELDUNGEN
                      </span>
                    )}
                  </div>

                  <div className="mb-8">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">{f.region}</span>
                    <h2 className="text-3xl font-black text-slate-800 mt-2 leading-tight group-hover:text-blue-600 transition-colors tracking-tighter">
                      {f.name}
                    </h2>
                  </div>
                  
                  <div className="flex gap-3 mb-10">
                    <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                      GRAD {f.difficulty}
                    </span>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${f.status === 'open' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                      {f.status === 'open' ? 'Geöffnet' : 'Gesperrt'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={() => f.topo_url ? setSelectedTopo(f) : null}
                      className={`w-full py-4 rounded-[1.5rem] font-black text-xs transition-all flex items-center justify-center gap-2 border ${
                        f.topo_url 
                        ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                        : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                      }`}
                    >
                      👁️ {f.topo_url ? 'SCHNELLÜBERSICHT' : 'KEIN TOPO'}
                    </button>
                    
                    <Link 
                      href={`/ferrata/${f.id}`}
                      className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                    >
                      📂 ANLAGENDOKUMENTATION
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RECHTER BEREICH: LIVE-FEED */}
          <aside className="lg:col-span-1">
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 sticky top-8 max-h-[85vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black tracking-tighter italic">Live-Feed</h3>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-6">
                {reports.length === 0 && <p className="text-xs font-bold text-slate-300 text-center py-10">Keine neuen Meldungen.</p>}
                
                {reports.map((report) => {
                  const ferrata = ferratas.find(f => f.id === report.ferrata_id);
                  return (
                    <div key={report.id} className={`p-6 rounded-[2rem] border transition-all ${report.verified ? 'bg-slate-50 border-transparent' : 'bg-amber-50 border-amber-100'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${report.verified ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{ferrata?.name || "Klettersteig"}</p>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-snug mb-4">{report.type}: {report.description}</p>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-slate-300 uppercase">
                          {new Date(report.created_at).toLocaleDateString()}
                        </span>
                        <Link 
                          href={`/ferrata/${report.ferrata_id}`}
                          className="text-[9px] font-black bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-900 hover:text-white transition-all uppercase"
                        >
                          Details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

        </div>

        {/* TOPO MODAL */}
        {selectedTopo && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-50 flex items-center justify-center p-6" onClick={() => setSelectedTopo(null)}>
            <div className="bg-white p-4 rounded-[3rem] max-w-5xl overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedTopo(null)} className="absolute top-6 right-6 bg-slate-100 w-10 h-10 rounded-full font-black z-10 flex items-center justify-center transition-transform hover:rotate-90">✕</button>
              <img src={selectedTopo.topo_url} className="max-h-[80vh] rounded-2xl object-contain" alt="Topo" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

