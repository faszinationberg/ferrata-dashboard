"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

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
  const [ferratas, setFerratas] = useState<Ferrata[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopo, setSelectedTopo] = useState<Ferrata | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: ferrataData } = await supabase.from('ferratas').select('*').order('name');
      const { data: reportData } = await supabase.from('reports').select('id, ferrata_id, verified').eq('resolved', false);

      if (ferrataData) setFerratas(ferrataData);
      if (reportData) setReports(reportData);
      setLoading(false);
    }
    loadData();
  }, []);

  const getStats = (id: string) => {
    const relevant = reports.filter(r => r.ferrata_id === id);
    return {
      total: relevant.length,
      unverified: relevant.filter(r => !r.verified).length
    };
  };

  // Hilfsfunktion für die Status-Farben (kannst du oben in der Komponente definieren)
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'open': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'maintenance': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'winter': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'closed': return 'bg-red-50 text-red-600 border-red-100';
      case 'unknown': return 'bg-white text-slate-400 border-slate-200'; // Weiß/Grau für Unbekannt
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

// Hilfsfunktion für die deutsche Beschriftung
const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    open: 'Geöffnet',
    maintenance: 'Wartung',
    winter: 'Winterpause',
    closed: 'Gesperrt'
  };
  return labels[status?.toLowerCase()] || status;
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
          
          {/* Minimal Cloud Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm">
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${ferratas.length > 0 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tighter">Cloud Live</span>
          </div>
        </header>

        {/* GRID: Jetzt über die volle Breite (da kein Aside mehr) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ferratas.map((f) => {
          const stats = getStats(f.id);

          // 1. Hilfslogik für Farben und Labels direkt im Mapping
          const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
            open: { label: 'Geöffnet', color: 'text-emerald-500', dot: 'bg-emerald-500' },
            closed: { label: 'Gesperrt', color: 'text-red-500', dot: 'bg-red-500' },
            maintenance: { label: 'Wartung', color: 'text-orange-500', dot: 'bg-orange-500' },
            winter: { label: 'Winterpause', color: 'text-blue-500', dot: 'bg-blue-500' },
          };

          const currentStatus = statusConfig[f.status?.toLowerCase()] || { 
            label: f.status, 
            color: 'text-slate-500', 
            dot: 'bg-slate-300' 
          };

          return (
            <div key={f.id} className="group bg-white border border-slate-200/60 rounded-2xl p-6 transition-all duration-300 hover:border-blue-200 hover:shadow-sm flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.1em]">{f.region}</span>
                  <div className="flex items-center gap-2">
                    {/* Status-Punkt & Label */}
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                      <div className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot} ${f.status === 'open' || f.status === 'maintenance' ? 'animate-pulse' : ''}`}></div>
                      <span className={`text-[9px] font-bold uppercase tracking-tight ${currentStatus.color}`}>
                        {currentStatus.label}
                      </span>
                    </div>
                    
                    {/* Benachrichtigungs-Indikator für neue Meldungen */}
                    {stats.unverified > 0 && (
                      <div className="h-2 w-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]" title={`${stats.unverified} neue Meldungen`}></div>
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
                {/* NEU: Direkter Link zur Wartung */}
                <Link 
                  href={`/ferrata/${f.id}/maintenance`}
                  className="w-full py-3 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-2 border bg-white text-slate-600 border-slate-100 hover:border-orange-200 hover:text-orange-600 shadow-sm"
                >
                  🛠️ WARTUNG & FEED
                </Link>
                
                {/* Bestehender Link zu den Stammdaten */}
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

        {/* TOPO MODAL: Filigraner mit flachem Look */}
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

