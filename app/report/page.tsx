"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase';

interface Ferrata {
  id: string;
  name: string;
  region: string;
  country: string;
  mountain_group: string;
  difficulty: string;
  status: string;
}

export default function PublicReportSearch() {
  const [ferratas, setFerratas] = useState<Ferrata[]>([]);
  const [loading, setLoading] = useState(true);
const supabase = createClient();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');
  const [filterMountainGroup, setFilterMountainGroup] = useState('All');

  useEffect(() => {
    async function loadFerratas() {
      const { data } = await supabase
        .from('ferratas')
        .select('id, name, region, country, mountain_group, difficulty, status')
        .order('name')
        .range(0, 2000); // Wichtig: Dein erhöhtes Limit
      if (data) setFerratas(data);
      setLoading(false);
    }
    loadFerratas();
  }, []);

  // Dynamische Filter-Optionen
  const countries = Array.from(new Set(ferratas.map(f => f.country))).filter(Boolean).sort();
  const regions = Array.from(new Set(ferratas
    .filter(f => filterCountry === 'All' || f.country === filterCountry)
    .map(f => f.region))).filter(Boolean).sort();
  const mountainGroups = Array.from(new Set(ferratas
    .filter(f => (filterCountry === 'All' || f.country === filterCountry) && (filterRegion === 'All' || f.region === filterRegion))
    .map(f => f.mountain_group))).filter(Boolean).sort();

  const filteredFerratas = ferratas.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCountry = filterCountry === 'All' || f.country === filterCountry;
    const matchesRegion = filterRegion === 'All' || f.region === filterRegion;
    const matchesMountain = filterMountainGroup === 'All' || f.mountain_group === filterMountainGroup;
    return matchesSearch && matchesCountry && matchesRegion && matchesMountain;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="animate-pulse text-slate-400 font-black uppercase tracking-widest text-xs">Suche wird vorbereitet...</div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans p-6">
      <div className="max-w-6xl mx-auto py-12">
        
        {/* HEADER */}
        <header className="mb-16 text-center">
          <h1 className="text-4xl font-light tracking-tight text-slate-900 mb-4">
            Mangel <span className="font-semibold text-blue-600">melden</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
            Wähle den betroffenen Klettersteig aus der Liste aus, um einen Mangel oder eine Beschädigung zu dokumentieren.
          </p>
        </header>

        {/* SEARCH & FILTER BAR */}
        <div className="space-y-8 mb-16">
          <div className="relative group max-w-2xl mx-auto">
            <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
              <span className="text-xl opacity-30">🔍</span>
            </div>
            <input 
              type="text" 
              placeholder="Klettersteig suchen..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-[2rem] py-6 pl-16 pr-8 shadow-xl shadow-slate-200/20 outline-none focus:border-blue-500 transition-all text-base"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
  {/* Geografie Gruppe: Auf Mobile untereinander, volle Breite */}
  <div className="flex flex-col sm:flex-row w-full sm:w-auto items-stretch sm:items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100">
    
    <select 
      value={filterCountry} 
      onChange={(e) => { setFilterCountry(e.target.value); setFilterRegion('All'); setFilterMountainGroup('All'); }} 
      className="bg-white border-none rounded-xl px-4 py-3 sm:py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
    >
      <option value="All">Land</option>
      {countries.map(c => <option key={c} value={c}>{c}</option>)}
    </select>

    <select 
      value={filterRegion} 
      onChange={(e) => { setFilterRegion(e.target.value); setFilterMountainGroup('All'); }} 
      disabled={regions.length === 0} 
      className="bg-white border-none rounded-xl px-4 py-3 sm:py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer disabled:opacity-40"
    >
      <option value="All">Region</option>
      {regions.map(r => <option key={r} value={r}>{r}</option>)}
    </select>

    <select 
      value={filterMountainGroup} 
      onChange={(e) => setFilterMountainGroup(e.target.value)} 
      disabled={mountainGroups.length === 0} 
      className="bg-white border-none rounded-xl px-4 py-3 sm:py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none shadow-sm cursor-pointer disabled:opacity-40"
    >
      <option value="All">Gebirge</option>
      {mountainGroups.map(m => <option key={m} value={m}>{m}</option>)}
    </select>

  </div>
</div>

        </div>

        {/* RESULTS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFerratas.map((f) => (
            <div key={f.id} className="bg-white border border-slate-200/60 rounded-3xl p-7 flex flex-col justify-between hover:shadow-md transition-all group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{f.country}</span>
                  <div className="px-2 py-0.5 border border-slate-100 rounded text-[9px] font-black text-slate-400">CAT {f.difficulty}</div>
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-6 group-hover:text-blue-600 transition-colors">{f.name}</h2>
                <div className="space-y-1 mb-8">
                  <p className="text-[11px] text-slate-500 font-medium">Region: <span className="text-slate-800">{f.region}</span></p>
                  <p className="text-[11px] text-slate-500 font-medium">Gebirge: <span className="text-slate-800">{f.mountain_group}</span></p>
                </div>
              </div>
              <Link 
                href={`/ferrata/${f.id}/report`}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all text-center shadow-lg shadow-slate-100"
              >
                Mangel melden
              </Link>
            </div>
          ))}

          {/* NO RESULTS / NEW FERRATA CASE */}
          {filteredFerratas.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
              <div className="text-5xl mb-6">🏔️🔍</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Klettersteig nicht gefunden?</h3>
              <p className="text-slate-400 max-w-sm mx-auto mb-10 text-sm leading-relaxed">
                Falls der gesuchte Steig nicht in unserer Datenbank gelistet ist, sende uns bitte eine E-Mail mit den Details.
              </p>
              <a 
                href={`mailto:developer@deine-domain.com?subject=Neuer Klettersteig für ferrata.report&body=Name des Klettersteigs: %0D%0ALand/Region: %0D%0AMangel-Beschreibung: `}
                className="inline-flex items-center gap-3 bg-blue-600 text-white px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
              >
                📧 Projekt-Admin informieren
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}