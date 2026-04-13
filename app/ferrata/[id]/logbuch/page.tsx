"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

export default function MaintenanceLog() {
  const router = useRouter();
  const { id } = useParams();

  // Dummy-Daten für die Historie
  const logs = [
    { 
      id: "LOG-2025-001", 
      date: "15.05.2025", 
      type: "Hauptüberprüfung (jährlich)", 
      inspector: "Dipl. Ing. Max Mustermann", 
      firm: "Ziviltechnikerbüro Alpin-Safe",
      result: "Mängelfrei",
      status: "success",
      documents: ["Prüfprotokoll_2025.pdf", "Foto-Dokumentation.zip"]
    },
    { 
      id: "LOG-2024-088", 
      date: "20.10.2024", 
      type: "Nachschau / Reparatur", 
      inspector: "Stefan Berg", 
      firm: "Bauhof Gemeinde",
      result: "Anker Sektion C getauscht",
      status: "warning",
      documents: ["Reparaturbericht_Okt24.pdf"]
    },
    { 
      id: "LOG-2024-012", 
      date: "12.05.2024", 
      type: "Hauptüberprüfung (jährlich)", 
      inspector: "Dipl. Ing. Max Mustermann", 
      firm: "Ziviltechnikerbüro Alpin-Safe",
      result: "Mängelfrei",
      status: "success",
      documents: ["Prüfprotokoll_2024.pdf"]
    }
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto">
        
        {/* Breadcrumbs & Navigation */}
        <nav className="mb-8 flex items-center gap-2 text-sm font-bold text-slate-400">
          <button onClick={() => router.push('/')} className="hover:text-slate-900">Dashboard</button>
          <span>/</span>
          <button onClick={() => router.back()} className="hover:text-slate-900">Grünstein-Klettersteig</button>
          <span>/</span>
          <span className="text-blue-600">Wartungslogbuch</span>
        </nav>

        <header className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">Wartungslogbuch</h1>
            <p className="text-slate-500 mt-2 font-medium">Lückenlose Dokumentation der Instandhaltung gemäß EN 16867</p>
          </div>
          <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg flex items-center gap-2">
            <span>➕</span> Neuer Eintrag (Manuell)
          </button>
        </header>

        {/* Statistik-Leiste */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Letzte Prüfung" value="15.05.2025" sub="Vor 322 Tagen" />
          <StatCard label="Nächste Prüfung" value="Mai 2026" sub="Fällig in 43 Tagen" highlight />
          <StatCard label="Prüfintervall" value="12 Monate" sub="Gesetzlich vorgeschrieben" />
        </div>

        {/* Die Log-Tabelle */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Datum & ID</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Art der Prüfung</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Prüfer / Firma</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ergebnis</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Dokumente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-6">
                    <p className="font-black text-slate-900">{log.date}</p>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">{log.id}</p>
                  </td>
                  <td className="p-6">
                    <p className="font-bold text-slate-700">{log.type}</p>
                  </td>
                  <td className="p-6">
                    <p className="text-sm font-bold text-slate-800">{log.inspector}</p>
                    <p className="text-xs text-slate-400">{log.firm}</p>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      <span className={`text-xs font-black uppercase ${log.status === 'success' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {log.result}
                      </span>
                    </div>
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex gap-2">
                      {log.documents.map((doc, i) => (
                        <button key={i} title={doc} className="p-2 bg-slate-100 hover:bg-blue-100 rounded-lg text-slate-500 hover:text-blue-600 transition-all">
                          📄
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <footer className="mt-12 p-8 bg-blue-900 rounded-[2.5rem] text-white flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="font-black text-xl tracking-tight">Vollständiges Archiv exportieren</h4>
            <p className="text-blue-200 text-sm mt-1">Erstellt eine signierte PDF-Zusammenfassung aller Wartungen.</p>
          </div>
          <button className="bg-white text-blue-900 px-8 py-3 rounded-xl font-black text-sm hover:bg-blue-50 transition-all">
            PDF-REPORT GENERIEREN
          </button>
        </footer>
      </div>
    </main>
  );
}

function StatCard({ label, value, sub, highlight = false }: { label: string, value: string, sub: string, highlight?: boolean }) {
  return (
    <div className={`p-8 rounded-[2rem] border shadow-sm ${highlight ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
      <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>{label}</p>
      <p className="text-3xl font-black tracking-tighter">{value}</p>
      <p className={`text-xs mt-2 font-medium ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{sub}</p>
    </div>
  );
}