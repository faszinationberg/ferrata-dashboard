"use client";

export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { supabase } from '../../lib/supabase';

import { CloudStatusBadge } from '@/app/components/CloudStatusBadge';
import { useAuth } from '@/app/hooks/useAuth';

interface Ferrata {
  id: string;
  name: string;
  region: string;
  country: string;
  mountain_group: string;
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

  const { userRole } = useAuth();

  // Hilfsfunktion zum Laden aus dem Speicher
  const getSavedFilter = (key: string, defaultValue: string) => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(key) || defaultValue;
    }
    return defaultValue;
  };

  // States initialisieren mit gespeicherten Werten
  const [searchQuery, setSearchQuery] = useState(() => getSavedFilter('f_search', ''));
  const [filterCountry, setFilterCountry] = useState(() => getSavedFilter('f_country', 'All'));
  const [filterRegion, setFilterRegion] = useState(() => getSavedFilter('f_region', 'All'));
  const [filterMountainGroup, setFilterMountainGroup] = useState(() => getSavedFilter('f_mountain', 'All'));
  const [filterStatus, setFilterStatus] = useState(() => getSavedFilter('f_status', 'All'));
  const [filterDifficulty, setFilterDifficulty] = useState(() => getSavedFilter('f_diff', 'All'));

  // --- DYNAMISCHE OPTIONEN FÜR FILTER GENERIEREN ---
  const countries = Array.from(new Set(ferratas.map(f => f.country))).filter(Boolean).sort();
  
  const regions = Array.from(new Set(ferratas
    .filter(f => filterCountry === 'All' || f.country === filterCountry)
    .map(f => f.region)))
    .filter(Boolean).sort();

  const mountainGroups = Array.from(new Set(ferratas
    .filter(f => (filterCountry === 'All' || f.country === filterCountry) && (filterRegion === 'All' || f.region === filterRegion))
    .map(f => f.mountain_group)))
    .filter(Boolean).sort();

  // --- FILTER-LOGIK ---
  const filteredFerratas = ferratas.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = filterCountry === 'All' || f.country === filterCountry;
    const matchesRegion = filterRegion === 'All' || f.region === filterRegion;
    const matchesMountain = filterMountainGroup === 'All' || f.mountain_group === filterMountainGroup;
    const matchesStatus = filterStatus === 'All' || f.status === filterStatus;
    const matchesDiff = filterDifficulty === 'All' || f.difficulty.startsWith(filterDifficulty);

    return matchesSearch && matchesCountry && matchesRegion && matchesMountain && matchesStatus && matchesDiff;
  });

  async function loadData() {
  setLoading(true);
  
  // Wir fügen .range(0, 2000) oder ein hohes .limit() hinzu
  const { data: ferrataData, error } = await supabase
    .from('ferratas')
    .select('*')
    .order('name')
    .range(0, 2000); // Erlaubt das Laden der ersten 2000 Einträge

  const { data: reportData } = await supabase
    .from('reports')
    .select('id, ferrata_id, verified')
    .eq('resolved', false);

  if (ferrataData) setFerratas(ferrataData);
  if (reportData) setReports(reportData);
  setLoading(false);
}

  useEffect(() => {
    async function checkUserAndLoadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      await loadData();
    }
    checkUserAndLoadData();
  }, [router]);

  useEffect(() => {
    sessionStorage.setItem('f_search', searchQuery);
    sessionStorage.setItem('f_country', filterCountry);
    sessionStorage.setItem('f_region', filterRegion);
    sessionStorage.setItem('f_mountain', filterMountainGroup);
    sessionStorage.setItem('f_status', filterStatus);
    sessionStorage.setItem('f_diff', filterDifficulty);
  }, [searchQuery, filterCountry, filterRegion, filterMountainGroup, filterStatus, filterDifficulty]);


  const handleCreateFerrata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    try {
      const { data, error } = await supabase
        .from('ferratas')
        .insert([{ 
          name: newFerrata.name, 
          region: newFerrata.region, 
          difficulty: newFerrata.difficulty,
          status: 'unknown' 
        }])
        .select();
      if (error) throw error;
      setShowAddModal(false);
      setNewFerrata({ name: '', region: '', difficulty: 'C' });
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFerrata = async (e: React.MouseEvent, ferrata: Ferrata) => {
  e.preventDefault(); // Verhindert, dass man auf die Detailseite weitergeleitet wird
  e.stopPropagation();

  const confirmDelete = window.confirm(
    `Bist du sicher, dass du "${ferrata.name}" unwiderruflich löschen möchtest? Alle zugehörigen Meldungen und Daten gehen verloren.`
    );

    if (confirmDelete) {
      try {
        const { error } = await supabase
          .from('ferratas')
          .delete()
          .eq('id', ferrata.id);

        if (error) throw error;

        // Lokalen State aktualisieren, ohne die ganze Seite neu zu laden
        setFerratas(prev => prev.filter(f => f.id !== ferrata.id));
        
      } catch (err: any) {
        alert("Fehler beim Löschen: " + err.message);
      }
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

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCountry('All');
    setFilterRegion('All');
    setFilterMountainGroup('All');
    setFilterStatus('All');
    setFilterDifficulty('All');
  };

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-blue-100">
      <div className="max-w-6xl mx-auto px-6 py-12">
        
        {/* HEADER */}
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-light tracking-tight text-slate-900">
              ferrata<span className="font-semibold">.report</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 tracking-wide font-light">Monitoring & Documentation — G. Ausserhofer</p>
          </div>
          <CloudStatusBadge />
        </header>

        {/* --- ÜBERARBEITETE FILTER BAR --- */}
        <div className="space-y-8 mb-12">
          
          {/* 1. SUCHE (Full Width) */}
          <div className="relative group max-w-3xl mx-auto">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <span className="text-xl grayscale opacity-30 group-focus-within:opacity-100 group-focus-within:grayscale-0 transition-all">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Klettersteig oder Region suchen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200/60 rounded-[2rem] py-6 pl-16 pr-8 shadow-xl shadow-slate-200/20 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 transition-all text-base font-medium placeholder:text-slate-300"
            />
          </div>

          {/* 2. FILTER-ZEILE (Horizontaler Scroll auf Mobile) */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-center gap-3">
              
              {/* Geografie Gruppe */}
              <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100">
                <select 
                  value={filterCountry} 
                  onChange={(e) => { setFilterCountry(e.target.value); setFilterRegion('All'); setFilterMountainGroup('All'); }}
                  className="bg-white border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <option value="All">Land</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select 
                  value={filterRegion} 
                  onChange={(e) => { setFilterRegion(e.target.value); setFilterMountainGroup('All'); }}
                  disabled={regions.length === 0}
                  className="bg-white border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer disabled:opacity-40"
                >
                  <option value="All">Region</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select 
                  value={filterMountainGroup} 
                  onChange={(e) => setFilterMountainGroup(e.target.value)}
                  disabled={mountainGroups.length === 0}
                  className="bg-white border-none rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer disabled:opacity-40"
                >
                  <option value="All">Gebirge</option>
                  {mountainGroups.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Status & Schwierigkeit */}
              <div className="flex items-center gap-2">
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm hover:border-blue-200 transition-all"
                >
                  <option value="All">Status: Alle</option>
                  <option value="unknown">⚪ Unbekannt</option>
                  <option value="open">🟢 Geöffnet</option>
                  <option value="closed">🔴 Gesperrt</option>
                  <option value="maintenance">🟠 Wartung</option>
                </select>

                <select 
                  value={filterDifficulty} 
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="bg-white border border-slate-200/60 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm hover:border-blue-200 transition-all"
                >
                  <option value="All">Schwierigkeit</option>
                  {['A', 'B', 'C', 'D', 'E', 'F'].map(grade => (
                    <option key={grade} value={grade}>Kategorie {grade}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. INFO LEISTE (Counter & Reset) */}
            <div className="flex items-center justify-center gap-6 pt-2">
              <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                  {filteredFerratas.length} <span className="font-light">Objekte gefunden</span>
                </span>
              </div>

              {(searchQuery || filterCountry !== 'All' || filterStatus !== 'All' || filterDifficulty !== 'All') && (
                <button 
                  onClick={resetFilters}
                  className="text-[10px] font-black text-red-400 hover:text-red-500 uppercase tracking-widest flex items-center gap-1.5 transition-all group"
                >
                  <span className="bg-red-50 p-1 rounded-md group-hover:bg-red-100 transition-colors">✕</span>
                  Filter zurücksetzen
                </button>
              )}
            </div>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button 
            onClick={() => setShowAddModal(true)}
            className="group bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-blue-300 hover:bg-blue-50/30 flex flex-col items-center justify-center gap-4 min-h-[300px]"
          >
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all shadow-sm">
              <span className="text-2xl font-light">+</span>
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500">Neuen Steig anlegen</span>
          </button>

          {filteredFerratas.map((f) => {
  const stats = getStats(f.id);
  const statusConfig: Record<string, { label: string; color: string; dot: string; bg: string }> = {
    open: { label: 'Geöffnet', color: 'text-emerald-600', dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
    closed: { label: 'Gesperrt', color: 'text-red-600', dot: 'bg-red-500', bg: 'bg-red-50' },
    maintenance: { label: 'Wartung', color: 'text-orange-600', dot: 'bg-orange-500', bg: 'bg-orange-50' },
    winter: { label: 'Winterpause', color: 'text-blue-600', dot: 'bg-blue-500', bg: 'bg-blue-50' },
    unknown: { label: 'Unbekannt', color: 'text-slate-400', dot: 'bg-slate-300', bg: 'bg-slate-50' }
  };

  const currentStatus = statusConfig[f.status?.toLowerCase()] || statusConfig.unknown;

  return (
    <div key={f.id} className="group bg-white border border-slate-200/60 rounded-3xl p-7 transition-all duration-300 hover:border-blue-200 hover:shadow-md flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
      
      {/* LÖSCH-BUTTON: Jetzt mit Rollenprüfung (Developer) */}
      {userRole === 'developer' && (
        <button 
          onClick={(e) => handleDeleteFerrata(e, f)}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 z-20"
          title="Klettersteig löschen"
        >
          <span className="text-xs font-bold text-[10px]">✕</span>
        </button>
      )}

      <div>
        <div className="flex justify-between items-start mb-6">
          {/* STATUS ANZEIGE */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-transparent transition-all ${currentStatus.bg}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${currentStatus.dot} ${f.status === 'open' || f.status === 'maintenance' ? 'animate-pulse' : ''}`}></div>
            <span className={`text-[9px] font-black uppercase tracking-wider ${currentStatus.color}`}>
              {currentStatus.label}
            </span>
          </div>

          {/* Warnpunkt für Meldungen */}
          {stats.unverified > 0 && (
            <div className="h-2.5 w-2.5 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)] border-2 border-white"></div>
          )}
        </div>

        {/* TITEL */}
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2 group-hover:text-blue-600 transition-colors leading-tight">
          {f.name}
        </h2>
        
        {/* KATEGORIE: Jetzt dezent (Border statt schwarzer Hintergrund) */}
        <div className="inline-block px-2.5 py-1 border border-slate-200 rounded-lg mb-6 bg-slate-50/30">
           <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase italic">CAT {f.difficulty}</span>
        </div>

        {/* GEOGRAFISCHE VERORTUNG */}
        <div className="space-y-1 mb-8 border-l-2 border-slate-50 pl-4">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest w-12">Land</span>
            <span className="text-[11px] font-bold text-slate-600">{f.country}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest w-12">Region</span>
            <span className="text-[11px] font-bold text-slate-600">{f.region || '—'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest w-12">Gruppe</span>
            <span className="text-[11px] font-bold text-blue-500/70">{f.mountain_group || '—'}</span>
          </div>
        </div>
      </div>

      {/* AKTIONEN */}
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <Link 
          href={`/ferrata/${f.id}/maintenance`}
          className="py-3.5 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 border bg-white text-slate-500 border-slate-100 hover:border-orange-200 hover:text-orange-600 hover:bg-orange-50/30 shadow-sm uppercase tracking-tighter"
        >
          Wartung
        </Link>
        <Link 
          href={`/ferrata/${f.id}`}
          className="bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black hover:bg-blue-600 transition-all flex items-center justify-center gap-2 tracking-tighter uppercase shadow-md shadow-slate-100"
        >
          Details
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