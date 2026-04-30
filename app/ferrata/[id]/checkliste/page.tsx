"use client";

import { useRouter, useParams } from 'next/navigation'; // Hier hat useParams gefehlt
import { useState } from 'react';

// 1. Definiere oben (außerhalb der Komponente oder am Anfang), wie ein Item aussieht:
interface ChecklistItem {
  id: number;
  section: string;
  task: string;
  status: string | null; // Hier erlauben wir beides!
}

export default function ChecklistPage() {
  const router = useRouter();
  const { id } = useParams();
  
  // 2. Weise dem State diesen Typ zu:
  const [items, setItems] = useState<ChecklistItem[]>([
    { id: 1, section: "Zustieg & Einstieg", task: "Beschilderung & Markierung ok?", status: null },
    { id: 2, section: "Zustieg & Einstieg", task: "Infotafel lesbar (Notruf/Grad)?", status: null },
    { id: 3, section: "Fels & Gelände", task: "Felszustand (kein loser Schutt)?", status: null },
    { id: 4, section: "Drahtseil", task: "Seilspannung korrekt?", status: null },
    { id: 5, section: "Drahtseil", task: "Keine Litzenbrüche?", status: null },
    { id: 6, section: "Verankerungen", task: "Anker fester Sitz (kein Spiel)?", status: null },
    { id: 7, section: "Verankerungen", task: "Korrosionsprüfung ok?", status: null },
    { id: 8, section: "Sonderelemente", task: "Brücken / Leitern fest?", status: null },
  ]);

  const updateStatus = (id: number, status: string) => {
    setItems(items.map(item => item.id === id ? { ...item, status } : item));
  };

  return (
    <main className="min-h-screen bg-slate-900 text-white p-4 pb-32 font-sans select-none">
      <div className="max-w-2xl mx-auto">
        
        {/* Header - Kompakt für Mobile */}
        <header className="flex justify-between items-center mb-8 pt-4 px-2">
          <button onClick={() => router.back()} className="text-slate-500 font-bold text-sm">✕ ABBRUCH</button>
          <div className="text-center">
            <h1 className="text-lg font-black tracking-tighter italic uppercase text-blue-500">Wartungsprotokoll</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Digitaler Prüfbogen</p>
          </div>
          <div className="w-16"></div>
        </header>

        {/* Info Box */}
        <section className="bg-slate-800 p-6 rounded-[2rem] mb-10 border border-slate-700 shadow-2xl">
          <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] mb-1">Anlage</p>
          <h2 className="text-2xl font-black mb-4">Grünstein-Klettersteig</h2>
          <div className="flex justify-between items-center pt-4 border-t border-slate-700">
            <div>
              <p className="text-[9px] font-bold text-slate-500 uppercase">Datum</p>
              <p className="text-sm font-bold text-slate-200">{new Date().toLocaleDateString('de-DE')}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-slate-500 uppercase">Prüfer</p>
              <p className="text-sm font-bold text-slate-200">Max M. (Technik)</p>
            </div>
          </div>
        </section>

        {/* Checkliste nach Sektionen */}
        <div className="space-y-12">
          {Array.from(new Set(items.map(i => i.section))).map(section => (
            <div key={section}>
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600 mb-5 ml-4">{section}</h3>
              <div className="space-y-4">
                {items.filter(i => i.section === section).map(item => (
                  <div key={item.id} className={`p-6 rounded-2xl border transition-all duration-300 ${
                    item.status ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/40 border-slate-800'
                  }`}>
                    <p className="font-bold text-slate-100 mb-6 leading-tight text-md px-1">{item.task}</p>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <StatusButton 
                        label="OK" 
                        active={item.status === 'ok'} 
                        activeColor="bg-emerald-600" 
                        onClick={() => updateStatus(item.id, 'ok')} 
                      />
                      <StatusButton 
                        label="MANGEL" 
                        active={item.status === 'warning'} 
                        activeColor="bg-amber-500" 
                        onClick={() => updateStatus(item.id, 'warning')} 
                      />
                      <StatusButton 
                        label="DEFEKT" 
                        active={item.status === 'danger'} 
                        activeColor="bg-red-600" 
                        onClick={() => updateStatus(item.id, 'danger')} 
                      />
                    </div>
                    
                    {/* Zusatzfunktionen bei Fehlern */}
                    {item.status && item.status !== 'ok' && (
                      <div className="mt-6 flex gap-3 animate-in fade-in slide-in-from-top-2">
                        <button className="flex-1 bg-slate-700 py-3 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 border border-slate-600">
                          📸 FOTO HINZUFÜGEN
                        </button>
                        <button className="flex-1 bg-slate-700 py-3 rounded-2xl text-[10px] font-black flex items-center justify-center gap-2 border border-slate-600">
                          📝 NOTIZ SCHREIBEN
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          <button 
            className="w-full max-w-xl mx-auto block bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm tracking-widest shadow-2xl shadow-blue-900/40 active:scale-95 transition-transform"
            onClick={() => {
              alert("Protokoll wird digital signiert und in das Logbuch übertragen.");
              router.push(`/ferrata/1/logbuch`);
            }}
          >
            PRÜFUNG ABSCHLIESSEN & SENDEN
          </button>
        </div>

      </div>
    </main>
  );
}

// Hilfskomponente für die großen Status-Buttons
function StatusButton({ label, active, activeColor, onClick }: { label: string, active: boolean, activeColor: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`py-4 rounded-2xl font-black text-[9px] tracking-widest transition-all duration-200 border-2 ${
        active 
        ? `${activeColor} border-white/20 text-white shadow-inner scale-95` 
        : 'bg-slate-900/50 border-slate-700 text-slate-500'
      }`}
    >
      {label}
    </button>
  );
}