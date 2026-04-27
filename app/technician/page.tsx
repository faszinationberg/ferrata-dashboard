"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { CloudStatusBadge } from '../components/CloudStatusBadge';
// PDF Importe
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function GlobalTechnicianPage() {
  const router = useRouter();
  const supabase = createClient();
  const { userEmail, userProfile, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [groupedDefects, setGroupedDefects] = useState<Record<string, any[]>>({});
  const [historyGroups, setHistoryGroups] = useState<Record<string, any[]>>({}); 
  
  const [selectedDefect, setSelectedDefect] = useState<any | null>(null);
  const [viewingHistoryDefect, setViewingHistoryDefect] = useState<any | null>(null); // NEU: Detailansicht Historie
  
  const [repairTime, setRepairTime] = useState('');
  const [repairMaterial, setRepairMaterial] = useState('');
  const [repairReport, setRepairReport] = useState('');
  const [repairImages, setRepairImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);


// --- HILFSFUNKTION FÜR BILDER (Rotation & Proportionen Fix) ---
const getBase64ImageFromUrl = async (imageUrl: string): Promise<{base64: string, width: number, height: number}> => {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    img.src = URL.createObjectURL(blob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Browser korrigieren die Rotation meist automatisch, wenn man auf Canvas zeichnet
      canvas.width = img.width;
      canvas.height = img.height;

      if (!ctx) {
        reject(new Error("Canvas Kontext Fehler"));
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Wir exportieren als JPEG mit guter Qualität
      const base64 = canvas.toDataURL("image/jpeg", 0.8);
      resolve({
        base64,
        width: img.width,
        height: img.height
      });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
  });
};

// --- DIE HAUPTFUNKTION ---
const generatePDF = async (d: any) => {
  const doc = new jsPDF();
  const date = new Date(d.resolved_at).toLocaleDateString('de-DE');

  // 1. Header & Titel
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text("Reparatur-Dokumentation", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Anlage: ${d.ferratas?.name || 'Unbekannt'}`, 14, 30);
  doc.text(`Datum: ${date}`, 14, 35);
  doc.text(`Techniker: ${userProfile?.full_name || userEmail || 'Nicht angegeben'}`, 14, 40);

  // 2. Tabelle mit technischen Details
  autoTable(doc, {
    startY: 50,
    head: [['Kategorie', 'Details']],
    body: [
      ['Mangel / Titel', d.title || d.type || '-'],
      ['Ort / Position', d.location || 'Nicht angegeben'],
      ['Arbeitszeit', d.repair_time || '-'],
      ['Materialeinsatz', d.repair_material || '-'],
      ['Technischer Bericht', d.repair_report || 'Keine Beschreibung hinterlegt'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    styles: { fontSize: 10, cellPadding: 5 }
  });

  // 3. Bild-Dokumentation (Falls Bilder vorhanden sind)
  if (d.repair_image_urls && d.repair_image_urls.length > 0) {
    let currentY = (doc as any).lastAutoTable.finalY + 20;
    
    // Überschrift Fotodokumentation
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Fotodokumentation", 14, currentY);
    currentY += 10;

    const maxBoxWidth = 85;  // Breite für ein Bild im 2-Spalten-Layout
    const maxBoxHeight = 65; // Maximale Höhe pro Bild
    const margin = 14;
    const spacing = 10;

    for (let i = 0; i < d.repair_image_urls.length; i++) {
      try {
        const imgData = await getBase64ImageFromUrl(d.repair_image_urls[i]);
        
        // Seitenverhältnis (Ratio) berechnen
        const ratio = imgData.width / imgData.height;
        let printWidth, printHeight;

        if (ratio > 1) {
          // Querformat
          printWidth = maxBoxWidth;
          printHeight = maxBoxWidth / ratio;
          if (printHeight > maxBoxHeight) {
            printHeight = maxBoxHeight;
            printWidth = maxBoxHeight * ratio;
          }
        } else {
          // Hochformat
          printHeight = maxBoxHeight;
          printWidth = maxBoxHeight * ratio;
          if (printWidth > maxBoxWidth) {
            printWidth = maxBoxWidth;
            printHeight = maxBoxWidth / ratio;
          }
        }

        // Automatischer Seitenumbruch, falls das Bild nicht mehr drauf passt
        if (currentY + printHeight > 275) {
          doc.addPage();
          currentY = 20;
        }

        // X-Position berechnen (2 Spalten Layout)
        const xOffset = margin + (i % 2) * (maxBoxWidth + spacing);
        // Zentrierung innerhalb der Spalte
        const centeredX = xOffset + (maxBoxWidth - printWidth) / 2;

        doc.addImage(imgData.base64, 'JPEG', centeredX, currentY, printWidth, printHeight);

        // Nach jedem zweiten Bild die Y-Position für die nächste Zeile erhöhen
        if (i % 2 === 1 || i === d.repair_image_urls.length - 1) {
          currentY += maxBoxHeight + spacing;
        }
      } catch (error) {
        console.error("Fehler beim Hinzufügen eines Bildes zum PDF:", error);
      }
    }
  }

  // 4. Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Seite ${i} von ${pageCount} — Generiert via ferrata.report`, 14, doc.internal.pageSize.height - 10);
  }

  // 5. Download auslösen
  const fileName = `Reparatur_${d.ferratas?.name?.replace(/\s+/g, '_')}_${date}.pdf`;
  doc.save(fileName);
};

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: openData } = await supabase
        .from('defects')
        .select(`*, ferratas!defects_ferrata_id_fkey ( name )`)
        .eq('resolved', false);

      const { data: historyData } = await supabase
        .from('defects')
        .select(`*, ferratas!defects_ferrata_id_fkey ( name )`)
        .eq('resolved', true)
        .eq('resolved_by', user.id)
        .order('resolved_at', { ascending: false });

      if (openData) {
        const groups = openData.reduce((acc: any, defect: any) => {
          const ferrataName = defect.ferratas?.name || "Unbekannte Anlage";
          if (!acc[ferrataName]) acc[ferrataName] = [];
          acc[ferrataName].push(defect);
          return acc;
        }, {});
        setGroupedDefects(groups);
      }

      if (historyData) {
        const hGroups = historyData.reduce((acc: any, defect: any) => {
          const ferrataName = defect.ferratas?.name || "Unbekannte Anlage";
          if (!acc[ferrataName]) acc[ferrataName] = [];
          acc[ferrataName].push(defect);
          return acc;
        }, {});
        setHistoryGroups(hGroups);
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!userEmail) router.push('/login');
      else fetchData();
    }
  }, [authLoading, userEmail]);

  const handleRepairComplete = async () => {
    if (!selectedDefect || !repairReport) return;
    setUploading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const uploadedUrls: string[] = [];

      for (const file of repairImages) {
        const path = `repairs/${selectedDefect.ferrata_id}/${Date.now()}_${file.name}`;
        await supabase.storage.from('reports').upload(path, file);
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(path);
        uploadedUrls.push(urlData.publicUrl);
      }

      const { error: updateError } = await supabase.from('defects').update({
        repair_time: repairTime,
        repair_material: repairMaterial,
        repair_report: repairReport,
        repair_image_urls: uploadedUrls,
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id 
      }).eq('id', selectedDefect.id);

      if (updateError) throw updateError;

      await supabase.from('maintenance_logs').insert([{
        ferrata_id: selectedDefect.ferrata_id,
        log_type: 'Reparatur', 
        description: `ERLEDIGT: ${selectedDefect.title}. Durch: ${userProfile?.full_name || userEmail}`,
        date: new Date().toISOString()
      }]);

      setSelectedDefect(null);
      setRepairImages([]);
      setRepairReport('');
      setRepairTime('');
      setRepairMaterial('');
      fetchData();
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-[#fafafa] pb-32">
      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-16">
        
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Techniker-Dashboard</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 mt-1">Einsatzplanung & Dokumentation</p>
          </div>
          <CloudStatusBadge />
        </header>

        {/* SEKTION 1: OFFENE AUFTRÄGE */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Offene Reparaturen</h2>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>
          
          {loading ? <div className="animate-pulse h-20 bg-white rounded-3xl" /> : (
            Object.entries(groupedDefects).map(([name, defects]) => (
              <div key={name} className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">{name}</p>
                <div className="grid gap-2">
                  {defects.map(d => (
                    <div key={d.id} onClick={() => setSelectedDefect(d)} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 hover:border-orange-400 cursor-pointer transition-all">
                      <div className={`w-1 h-8 rounded-full ${d.priority === 'Kritisch' ? 'bg-red-500' : 'bg-orange-400'}`} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400">{d.location}</p>
                        <h4 className="text-sm font-bold text-slate-800">{d.title}</h4>
                      </div>
                      <span className="text-xs">🔧</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* SEKTION 2: EIGENE HISTORIE */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Meine erledigten Einsätze</h2>
             <div className="h-px flex-1 bg-slate-100"></div>
          </div>

          {Object.entries(historyGroups).length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-10">Noch keine abgeschlossenen Einsätze dokumentiert.</p>
          ) : (
            Object.entries(historyGroups).map(([name, defects]) => (
              <div key={name} className="space-y-3">
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest ml-4">{name}</p>
                <div className="grid gap-2">
                  {defects.map(d => (
                    <div 
                      key={d.id} 
                      onClick={() => setViewingHistoryDefect(d)}
                      className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-all group"
                    >
                      <div className="w-1 h-8 bg-emerald-400 rounded-full" />
                      <div className="flex-1">
                        <p className="text-[9px] font-bold text-slate-400">
                          {new Date(d.resolved_at).toLocaleDateString('de-DE')} — {d.repair_time}
                        </p>
                        <h4 className="text-xs font-bold text-slate-600">{d.title}</h4>
                      </div>
                      <span className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm">Details 📄</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* REPARATUR LIGHTBOX (Offene Mängel) */}
      {selectedDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Einsatz dokumentieren</h2>
                <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mt-1">
                  {selectedDefect.ferratas?.name} — {selectedDefect.title}
                </p>
              </div>
              <button onClick={() => setSelectedDefect(null)} className="text-3xl text-slate-300 hover:text-slate-900 transition-colors">×</button>
            </div>

            <div className="overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Arbeitszeit</label>
                   <input type="text" placeholder="z.B. 2h" value={repairTime} onChange={e => setRepairTime(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-orange-200 transition-all" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Material</label>
                   <input type="text" placeholder="z.B. Drahtseilklemme" value={repairMaterial} onChange={e => setRepairMaterial(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:bg-white focus:border-orange-200 transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technischer Bericht *</label>
                <textarea value={repairReport} onChange={e => setRepairReport(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[120px] outline-none focus:bg-white focus:border-orange-200 transition-all" placeholder="Beschreibe die durchgeführten Maßnahmen..." />
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ergebnis-Fotos</p>
                <div className="flex flex-wrap gap-4">
                   <label className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-200 transition-all text-slate-300">
                     <span className="text-xl">📸</span>
                     <input type="file" multiple className="hidden" onChange={e => e.target.files && setRepairImages(Array.from(e.target.files))} />
                   </label>
                   {repairImages.map((f, i) => (
                     <div key={i} className="w-24 h-24 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 relative group">
                       <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="Preview" />
                       <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <button onClick={() => setRepairImages(prev => prev.filter((_, idx) => idx !== i))} className="text-white text-xs font-bold">Löschen</button>
                       </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
               <button onClick={() => setSelectedDefect(null)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abbrechen</button>
               <button 
                 onClick={handleRepairComplete} 
                 disabled={uploading || !repairReport} 
                 className="flex-[2] py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-orange-100 disabled:bg-slate-300 disabled:shadow-none active:scale-[0.98] transition-all"
               >
                 {uploading ? 'Wird gespeichert...' : 'Einsatz abschließen'}
               </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL LIGHTBOX (Historie) */}
      {viewingHistoryDefect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Reparatur-Details</h2>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Abgeschlossener Einsatz</p>
              </div>
              <button onClick={() => setViewingHistoryDefect(null)} className="text-2xl text-slate-300 hover:text-slate-900 transition-colors">×</button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Zeitaufwand</p>
                  <p className="text-sm font-bold text-slate-700">{viewingHistoryDefect.repair_time || 'k.A.'}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Material</p>
                  <p className="text-sm font-bold text-slate-700">{viewingHistoryDefect.repair_material || 'Keines'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Durchgeführte Arbeiten</p>
                <div className="bg-slate-50 rounded-2xl p-4 text-xs leading-relaxed text-slate-600 border border-slate-100 italic">
                  "{viewingHistoryDefect.repair_report}"
                </div>
              </div>

              {viewingHistoryDefect.repair_image_urls?.length > 0 && (
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Dokumentation</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {viewingHistoryDefect.repair_image_urls.map((url: string, i: number) => (
                      <img key={i} src={url} className="w-20 h-20 object-cover rounded-xl border border-slate-100 flex-shrink-0" alt="Repair" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 rounded-b-[2.5rem] flex gap-3">
              <button 
                onClick={() => generatePDF(viewingHistoryDefect)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>📥</span> PDF Protokoll generieren
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}