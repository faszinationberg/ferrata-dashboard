"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function FerrataDetails() {
  const router = useRouter();
  const params = useParams();
  const idFromUrl = params.id;

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showTopoModal, setShowTopoModal] = useState(false);

  // DUMMY DATEN (Vollständig erhalten & um Verwaltungsfelder erweitert)
  const ferrata = {
    id: idFromUrl,
    name: idFromUrl === "gruenstein" ? "Grünstein-Klettersteig" : "Klettersteig " + idFromUrl,
    region: "Berchtesgadener Alpen / Bayern",
    status: "open", // Falls auf 'closed' gesetzt, wird der Sperrgrund angezeigt
    closure_reason: "Revision der Seilbrücke nach Unwetterschäden", // NEU
    
    // NEU: Verwaltungsdaten
    operator: "Sektion Berchtesgaden d. DAV", 
    maintenance_contract: true, 
    technician: "Alpiner Sicherheitsservice GmbH (Max Bergmann)",

    difficulty: "D",
    topo_url: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=1000",
    geo: {
      elevation_start: 640,
      elevation_end: 1174,
      coord_start: "47.592, 12.975",
      coord_end: "47.601, 12.982",
      vertical_meters: 534,
    },
    tech: {
      construction_year: 2011,
      company: "Alpiner Sicherheitsservice GmbH",
      norm_compliant: true,
      rope_diameter: "14mm",
      rope_length: 1200,
      anchor_count: 145,
      special_elements: "Hängebrücke (25m), Flying Fox (optional)",
      notes: "Regelmäßiger Steinschlag in Sektion B nach Starkregen beachten."
    },
    images: [
      { url: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&q=80&w=1000", title: "Einstiegswand" },
      { url: "https://images.unsplash.com/photo-1601342591701-a08331580f74?auto=format&fit=crop&q=80&w=1000", title: "Seilbrücke Sektion C" },
      { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1000", title: "Gipfelpanorama" }
    ],
    reports: [
      { id: 1, type: "Seil locker", desc: "Sektion C, dritter Anker nach der Kante.", date: "Gestern", priority: "high", verified: true },
      { id: 2, type: "Markierung fehlt", desc: "Zustiegsweg Kreuzung Waldrand.", date: "Vor 3 Tagen", priority: "low", verified: true },
      { id: 3, type: "Steinschlag", desc: "User-Meldung: Loses Gestein oberhalb der Querung.", date: "Vor 1h", priority: "medium", verified: false }
    ],
    history: [
      { date: "15.05.2025", inspector: "Max Mustermann", result: "Mängelfrei", type: "Hauptprüfung" },
      { date: "20.10.2024", inspector: "Stefan Berg", result: "Kleiner Mangel behoben", type: "Nachschau" },
      { date: "12.05.2024", inspector: "Max Mustermann", result: "Mängelfrei", type: "Hauptprüfung" }
    ]
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Navigation */}
        <button 
          onClick={() => router.push('/')} 
          className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-all font-bold"
        >
          <span>←</span> Zurück zum Dashboard
        </button>

        {/* Header Unit */}
        <header className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl shadow-slate-200/50 border border-white mb-10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">{ferrata.region}</p>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">{ferrata.name}</h1>
              
              {/* NEU: Sperrgrund-Warnung */}
              {ferrata.status !== "open" && (
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-2xl inline-block">
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Grund der Sperrung</p>
                   <p className="text-sm font-bold text-red-800">{ferrata.closure_reason}</p>
                </div>
              )}

              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowTopoModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                  🗺️ Interaktives Topo öffnen
                </button>
              </div>
            </div>
            <div className="flex gap-4">
              <Badge label="Schwierigkeit" value={ferrata.difficulty} color="bg-slate-900 text-white" />
              <Badge 
                label="Status" 
                value={ferrata.status === "open" ? "AKTIV" : "GESPERRT"} 
                color={ferrata.status === "open" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"} 
              />
            </div>
          </div>
        </header>

        {/* 1. SICHERHEITSMELDUNGEN */}
        <section className="mb-10 overflow-hidden rounded-[2.5rem] border-2 border-red-100 bg-red-50/30 shadow-sm">
          <div className="bg-red-500 px-8 py-3 flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
              <h3 className="font-black uppercase text-xs tracking-widest">⚠️ Sicherheitsmeldungen</h3>
              <span className="bg-white text-red-500 px-2 py-0.5 rounded-lg text-[10px] font-black">{ferrata.reports.length}</span>
            </div>
            <Link 
              href={`/ferrata/report?name=${encodeURIComponent(ferrata.name)}`}
              className="w-8 h-8 bg-white text-red-500 rounded-full flex items-center justify-center font-black text-lg hover:scale-110 transition-all shadow-md"
            >
              +
            </Link>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {ferrata.reports.map(r => (
              <div key={r.id} className={`p-5 rounded-2xl shadow-sm border flex gap-4 items-start transition-all ${!r.verified ? 'bg-amber-50 border-amber-200' : 'bg-white border-red-100'}`}>
                <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 
                  ${!r.verified ? 'bg-amber-500' : (r.priority === 'high' ? 'bg-red-500 animate-pulse' : 'bg-amber-400')}
                `}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black text-[10px] uppercase text-slate-400">{r.type}</p>
                    {!r.verified && (
                      <span className="text-[8px] font-black bg-amber-200 text-amber-800 px-2 py-0.5 rounded uppercase tracking-tighter">Ungeprüft</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 leading-snug">{r.desc}</p>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-[10px] text-slate-400 italic font-medium">{r.date}</p>
                    {!r.verified && (
                      <button className="text-[9px] font-black bg-white border border-amber-300 px-3 py-1 rounded-lg hover:bg-slate-900 hover:text-white transition-all uppercase">Prüfen</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. NEU: VERWALTUNG & SERVICE (Zentraler Block) */}
        <section className="mb-12 bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-3 italic">🏛️ Verwaltung & Service</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <DataField label="Betreiber / Eigentümer" value={ferrata.operator} />
            <DataField 
                label="Wartungsvertrag" 
                value={ferrata.maintenance_contract ? "✅ Aktiv & Dokumentiert" : "❌ Kein Vertrag hinterlegt"} 
            />
            <DataField label="Zuständige Firma / Techniker" value={ferrata.technician} />
          </div>
        </section>

        {/* 3. WARTUNGSHISTORIE */}
        <section className="mb-12 bg-white p-8 md:p-10 rounded-[3rem] shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
            <div className="flex items-center gap-4">
              <div className="bg-slate-100 p-3 rounded-2xl text-2xl">📋</div>
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-800">Wartungshistorie</h3>
                <Link 
                  href={`/ferrata/${ferrata.id}/logbuch`} 
                  className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                >
                  Zum vollständigen Logbuch <span className="text-lg">→</span>
                </Link>
              </div>
            </div>
            <Link 
              href={`/ferrata/${ferrata.id}/checkliste`}
              className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              <span className="text-xl">+</span> NEUE PRÜFUNG STARTEN
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ferrata.history.map((entry, i) => (
              <div key={i} className="flex flex-col p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Datum</p>
                    <p className="text-xs font-black text-slate-800 leading-none">{entry.date}</p>
                  </div>
                  <span className="text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
                    {entry.result}
                  </span>
                </div>
                <h4 className="font-black text-slate-800 text-lg mb-1 leading-tight">{entry.type}</h4>
                <p className="text-xs text-slate-500 font-medium italic">Prüfer: {entry.inspector}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. DETAILS & FOTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">📍 Geographie</h3>
              <div className="grid grid-cols-2 gap-8">
                <DataField label="Einstieg" value={`${ferrata.geo.elevation_start} m`} />
                <DataField label="Ausstieg" value={`${ferrata.geo.elevation_end} m`} />
                <DataField label="GPS Einstieg" value={ferrata.geo.coord_start} />
                <DataField label="Höhenmeter" value={`${ferrata.geo.vertical_meters} hm`} />
              </div>
            </section>

            <section className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-2xl font-black mb-8 flex items-center gap-3">📸 Fotodokumentation</h3>
              <div className="aspect-video w-full overflow-hidden rounded-[2.5rem] bg-slate-100 mb-6 shadow-inner">
                <img src={ferrata.images[activeImgIndex].url} className="h-full w-full object-cover" />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {ferrata.images.map((img, index) => (
                  <button 
                    key={index} 
                    onClick={() => setActiveImgIndex(index)} 
                    className={`h-20 w-32 flex-shrink-0 rounded-2xl overflow-hidden transition-all ${activeImgIndex === index ? 'ring-4 ring-blue-500 scale-95 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                  >
                    <img src={img.url} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200">
              <h3 className="text-xl font-black mb-8 italic text-slate-400">⚙️ Technische Daten</h3>
              <div className="space-y-6">
                <DataField label="Errichter" value={ferrata.tech.company} />
                <DataField label="Baujahr" value={ferrata.tech.construction_year} />
                <DataField label="Drahtseil Ø" value={ferrata.tech.rope_diameter} />
                <DataField label="Anker-Anzahl" value={ferrata.tech.anchor_count} />
              </div>
            </section>

            <section className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden">
              <h3 className="text-xl font-black mb-8">📄 Baudokumente</h3>
              <div className="space-y-3">
                <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex justify-between items-center transition-all text-xs font-bold">
                  Bau-Abschlussbericht <span>📥</span>
                </button>
                <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl flex justify-between items-center transition-all text-xs font-bold">
                  Statik-Gutachten <span>📥</span>
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* TOPO MODAL */}
        {showTopoModal && (
          <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setShowTopoModal(false)}>
            <div className="bg-white p-4 rounded-[3rem] max-w-5xl max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowTopoModal(false)} className="absolute top-8 right-8 bg-slate-100 w-12 h-12 rounded-full font-black text-xl flex items-center justify-center z-10 shadow-lg">✕</button>
              <img src={ferrata.topo_url} className="max-h-[85vh] w-full object-contain rounded-2xl" alt="Topo" />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Hilfskomponenten
function Badge({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className={`px-6 py-3 rounded-[1.5rem] text-center min-w-[100px] shadow-sm ${color}`}>
      <p className="text-[8px] font-black uppercase opacity-60 tracking-widest leading-none mb-1">{label}</p>
      <p className="text-xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function DataField({ label, value }: { label: string, value: any }) {
  return (
    <div className="border-b border-slate-100 pb-3">
      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-black text-slate-800 text-sm">{value || '---'}</p>
    </div>
  );
}