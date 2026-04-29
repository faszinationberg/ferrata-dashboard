"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../../../../lib/supabase';

import { CloudStatusBadge } from '../../../components/CloudStatusBadge';
import { FerrataStatusBadge } from '../../../components/FerrataStatusBadge';
import { useAuth } from '../../../hooks/useAuth';


// Ranking für die Sortierung
const priorityRank: Record<string, number> = {
  'kritisch': 1,
  'hoch': 2,
  'mittel': 3,
  'niedrig': 4
};

export default function MaintenanceCenter() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const supabase = createClient();
  // Nutze den Auth-Hook
  const { userRole, userEmail, loading: authLoading } = useAuth();

  // --- 1. STATES ---
  const [loading, setLoading] = useState(true);
  const [ferrata, setFerrata] = useState<any>(null);
  const [defects, setDefects] = useState<any[]>([]); // Jetzt aus Tabelle 'defects'
  const [userReports, setUserReports] = useState<any[]>([]); // Jetzt nur un-verifizierte aus 'reports'
  const [history, setHistory] = useState<any[]>([]);
  const [expandedDefects, setExpandedDefects] = useState<Record<string, boolean>>({});

  // Reparatur-Dokumentations States
  const [repairTime, setRepairTime] = useState('');
  const [repairMaterial, setRepairMaterial] = useState('');
  const [repairReport, setRepairReport] = useState('');
  const [repairImages, setRepairImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Modus-State: Setup (Zahnrad) oder Reparatur (Schlüssel)
  const [editMode, setEditMode] = useState<'admin' | 'repair'>('admin');

  // Lightbox & Admin States
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<'admin' | 'repair' | null>(null);
  const [tempPrio, setTempPrio] = useState<string | null>(null);
  const [adminTitle, setAdminTitle] = useState('');
  const [adminComment, setAdminComment] = useState('');
  
  // Galerie States
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isGalleryTopo, setIsGalleryTopo] = useState(false);

  // --- 2. DERIVED CONSTANTS ---
  const topoUrl = ferrata?.topo_url || null;

  // --- 3. HELPER FUNCTIONS ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setRepairImages(prev => [...prev, ...files]);
    }
  };

  const openGallery = (index: number | 'topo') => {
    if (index === 'topo') {
      setFullScreenImage(topoUrl);
      setIsGalleryTopo(true);
    } else if (selectedReport?.image_urls) {
      setFullScreenImage(selectedReport.image_urls[index as number]);
      setCurrentImgIndex(index as number);
      setIsGalleryTopo(false);
    }
  };

  const getPriorityStyles = (priority: string) => {
    const p = priority?.toLowerCase();
    switch (p) {
      case 'kritisch': 
        return { bar: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]', badge: 'bg-red-50 text-red-600 border-red-100', color: 'bg-red-500' };
      case 'hoch': 
        return { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-600 border-orange-100', color: 'bg-orange-500' };
      case 'mittel': 
        return { bar: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700 border-yellow-100', color: 'bg-yellow-400' };
      case 'niedrig': 
        return { bar: 'bg-slate-200', badge: 'bg-white text-slate-400 border-slate-200', color: 'bg-white' };
      default: 
        return { bar: 'bg-slate-300', badge: 'bg-slate-50 text-slate-400 border-slate-200', color: 'bg-slate-100' };
    }
  };

  // --- 4. DATA FETCHING ---
const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Basis-Daten laden (Ferrata, Meldungen, offene Mängel)
      const { data: ferrataData } = await supabase.from('ferratas').select('name, status, topo_url').eq('id', id).single();
      const { data: reportsData } = await supabase.from('reports').select('*').eq('ferrata_id', id).eq('verified', false).is('parent_defect_id', null).order('created_at', { ascending: false });
      const { data: allLinked } = await supabase.from('reports').select('*').eq('ferrata_id', id).not('parent_defect_id', 'is', null);
      const { data: defectsData } = await supabase.from('defects').select('*').eq('ferrata_id', id).eq('resolved', false);
      
      // 2. Historie-Quellen laden
      // A) Manuelle Einträge aus maintenance_logs
      const { data: logsData } = await supabase.from('maintenance_logs').select('*').eq('ferrata_id', id);
      // B) Erledigte Mängel aus defects
      const { data: resolvedDefects } = await supabase.from('defects').select('*').eq('ferrata_id', id).eq('resolved', true);

      // --- Zuweisung der Basis-Daten ---
      if (ferrataData) setFerrata(ferrataData);
      if (reportsData) setUserReports(reportsData);
      if (defectsData) {
        setDefects(defectsData.map(d => ({ ...d, children: allLinked?.filter(r => r.parent_defect_id === d.id) || [] }))
          .sort((a, b) => (priorityRank[a.priority?.toLowerCase()] || 99) - (priorityRank[b.priority?.toLowerCase()] || 99)));
      }

      // --- Zusammenführung der Historie ---
      const combinedHistory = [
  ...(logsData || []).map(log => ({
    // Wir nehmen created_at, falls date keine Uhrzeit hat (verhindert 02:00 Fehler)
    date: log.date.includes('T') ? log.date : log.created_at, 
    description: log.description,
    type: 'log',
    log_type: log.log_type,
    user_name: log.user_name,
    id: log.id
  })),
  ...(resolvedDefects || []).map(d => ({
    // Auch hier: bevorzugt resolved_at (volle Zeit) nutzen
    date: d.resolved_at || d.created_at, 
    description: `REPARATUR ERLEDIGT: ${d.title || d.type}${d.repair_report ? ` — ${d.repair_report}` : ''}`,
    type: 'repair',
    user_name: d.verified_by_name,
    id: d.id,
    material: d.repair_material
  }))
      ];

// --- DIE ENTSCHEIDENDE ÄNDERUNG: SORTIERUNG ---
// b.date - a.date sortiert absteigend (neueste zuerst)
const sortedHistory = combinedHistory.sort((a, b) => 
  new Date(b.date).getTime() - new Date(a.date).getTime()
);

setHistory(sortedHistory);

    } catch (err) { 
      console.error("Fetch Error:", err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  useEffect(() => {
    if (selectedReport) {
      setAdminTitle(selectedReport.title || selectedReport.type || "");
      setAdminComment(selectedReport.internal_comment || "");
      setTempPrio(selectedReport.priority || 'niedrig');
    }
  }, [selectedReport]);

  // --- 5. ACTIONS ---
  // Funktion innerhalb deiner Maintenance-Komponente
  const handleAttachToDefect = async (report: any, masterDefectId: string) => {
  try {
    const { data: masterDefect, error: fetchError } = await supabase
      .from('defects')
      .select('image_urls, title, report_count')
      .eq('id', masterDefectId)
      .single();

    if (fetchError || !masterDefect) {
      alert("Mangel nicht gefunden.");
      return;
    }

    await supabase
      .from('reports')
      .update({ parent_defect_id: masterDefectId, verified: true })
      .eq('id', report.id);

    const combinedImages = [...(masterDefect.image_urls || []), ...(report.image_urls || [])];
    const uniqueImages = Array.from(new Set(combinedImages)); // Hier war der Tippfehler vorher

    const { error: updateError } = await supabase
      .from('defects')
      .update({ 
        image_urls: uniqueImages, 
        report_count: (masterDefect.report_count || 1) + 1 
      })
      .eq('id', masterDefectId);

    if (updateError) throw updateError;

    await fetchData(); 
    setActiveLightbox(null);
    setSelectedReport(null);
  } catch (err: any) {
    console.error(err);
  }
  };

  const handleAction = async (action: 'verify' | 'discard') => {
    if (!selectedReport) return;

    // --- INTERNE FUNKTION ZUM ANHÄNGEN (Logik innerhalb von handleAction) ---
    const attachToExistingDefect = async (defectId: string) => {
      if (!selectedReport) return;

      const { error: updateReportError } = await supabase
        .from('reports')
        .update({ 
          parent_defect_id: defectId, 
          verified: true 
        })
        .eq('id', selectedReport.id);

      if (!updateReportError) {
        // Fotos zum Master-Mangel hinzufügen
        const targetDefect = defects.find(d => d.id === defectId);
        const updatedImages = [...(targetDefect?.image_urls || []), ...(selectedReport.image_urls || [])];
        
        await supabase
          .from('defects')
          .update({ image_urls: updatedImages })
          .eq('id', defectId);

        // --- NEU: LOG FÜR DAS ANHÄNGEN ---
        await supabase.from('maintenance_logs').insert([{
          ferrata_id: id,
          user_id: userRole === 'developer' ? 'dev-id' : 'admin-id', // Ersetze dies ggf. durch userData.user?.id
          user_name: userEmail,
          date: new Date().toISOString(),
          log_type: 'verification',
          description: `MELDUNG ZUGEORDNET: Ein Report von ${selectedReport.reporter_name || 'Gast'} wurde dem bestehenden Mangel [${targetDefect?.title}] zugewiesen.`
        }]);

        await fetchData();
        setActiveLightbox(null);
        setSelectedReport(null);
      }
    };

    // --- HAUPT-LOGIK DER AKTION ---
    if (action === 'discard') {
      if (!confirm("Eintrag wirklich entfernen?")) return;
      const table = (selectedReport as any).verified_by_name || selectedReport.priority ? 'defects' : 'reports';
      const { error } = await supabase.from(table).delete().eq('id', selectedReport.id);
      if (!error) {
        await fetchData();
        setSelectedReport(null);
        setActiveLightbox(null);
      }
    } else {
      // VERIFIZIEREN / VERSCHIEBEN
      if (!adminTitle || !tempPrio) {
        alert("Bitte Titel und Priorität festlegen.");
        return;
      }

      // FALL A: Es ist bereits ein Defekt (Update-Modus)
      if (defects.find(d => d.id === selectedReport.id)) {
        const { error } = await supabase.from('defects').update({
          title: adminTitle,
          priority: tempPrio,
          internal_comment: adminComment
        }).eq('id', selectedReport.id);
        
        if (!error) {
          await fetchData();
          setSelectedReport(null);
          setActiveLightbox(null);
        }
        return;
      }

      // FALL B: Umzug von 'reports' nach 'defects' (Neu-Erstellung)
      const { data: userData } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase.from('defects').insert([{
        ferrata_id: id,
        report_id: selectedReport.id,
        type: selectedReport.type,
        description: selectedReport.description,
        location: selectedReport.location,
        coordinates: selectedReport.coordinates,
        altitude: selectedReport.altitude,
        reporter_name: selectedReport.reporter_name,
        reporter_email: selectedReport.reporter_email,
        reporter_phone: selectedReport.reporter_phone,
        image_urls: selectedReport.image_urls,
        topo_x: selectedReport.topo_x,
        topo_y: selectedReport.topo_y,
        title: adminTitle,
        internal_comment: adminComment,
        priority: tempPrio,
        verified_by_name: userEmail,
        verified_by: userData.user?.id,
        verified_at: new Date().toISOString()
      }]);

      if (insertError) {
        alert("Fehler beim Verschieben: " + insertError.message);
      } else {
        // LOG FÜR NEU-ERSTELLUNG
        await supabase.from('maintenance_logs').insert([{
          ferrata_id: id,
          user_id: userData.user?.id,
          user_name: userEmail,
          date: new Date().toISOString(),
          log_type: 'verification',
          description: `MANGEL VERIFIZIERT: [${adminTitle}] (${tempPrio.toUpperCase()}). Gemeldet von ${selectedReport.reporter_name || 'Gast'}.`
        }]);

        await supabase.from('reports').delete().eq('id', selectedReport.id);
        await fetchData();
        setSelectedReport(null);
        setActiveLightbox(null);
      }
    }
  };

  const handleRepairComplete = async () => {
    if (!selectedReport) return;
    setUploading(true);
    
    try {
      const uploadedUrls: string[] = [];

      // 1. Bilder hochladen
      for (const file of repairImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `repair_${selectedReport.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('reports').upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(filePath);
        uploadedUrls.push(urlData.publicUrl);
      }

      // 2. In 'defects' als erledigt markieren
      const { error: updateError } = await supabase.from('defects').update({
          repair_time: repairTime,
          repair_material: repairMaterial,
          repair_report: repairReport,
          repair_image_urls: uploadedUrls,
          resolved: true,
          resolved_at: new Date().toISOString()
        }).eq('id', selectedReport.id);

      if (updateError) throw updateError;

      // 3. Historie schreiben
      await supabase.from('maintenance_logs').insert([{
        ferrata_id: id,
        report_id: selectedReport.id,
        type: 'Reparatur',
        description: `REPARATUR: ${selectedReport.title || selectedReport.type}. Zeit: ${repairTime}. Material: ${repairMaterial}`,
        date: new Date().toISOString().split('T')[0],
        performed_by: 'Wartungsteam'
      }]);

      setActiveLightbox(null);
      setSelectedReport(null);
      setRepairImages([]);
      setRepairTime('');
      setRepairMaterial('');
      setRepairReport('');
      fetchData();
      alert("Reparatur erfolgreich dokumentiert!");

    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const updateField = async (field: string, value: any) => {
    const { error } = await supabase.from('ferratas').update({ [field]: value }).eq('id', id);
    if (!error) setFerrata((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading || authLoading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col space-y-6 border-b border-slate-100 pb-3">
          <div className="flex justify-between items-start w-full">
            <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-slate-900 text-xs font-medium flex items-center gap-2">← Dashboard</button>
            <CloudStatusBadge />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative group">    
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{ferrata?.name}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mt-1 italic">Wartungs-Zentrale</p>
            </div>
            <FerrataStatusBadge 
              ferrataId={id} 
              initialStatus={ferrata?.status} 
              onUpdate={fetchData} // Damit die Wartungshistorie sofort den neuen Log zeigt
            />
        </div>
        </header> 


        {userRole === 'developer' && (
        // NEUES MODUL: JAHRESINSPEKTION STARTEN 
        <section className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6 relative overflow-hidden group">
          {/* Subtiler Hintergrund-Effekt */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all duration-700"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Sicherheits-Audit</h3>
              <h2 className="text-xl font-bold text-white mt-1">Jährliche Inspektion</h2>
              <p className="text-xs text-slate-400 mt-2 max-w-md leading-relaxed">
                Starte das geführte Protokoll, um den Gesamtzustand zu prüfen, Altschäden zu verifizieren und die offizielle Freigabe zu dokumentieren.
              </p>
            </div>
            
            <button 
              onClick={() => router.push(`/ferrata/${id}/inspections`)}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3"
            >
              <span>🚀</span> INSPEKTION STARTEN
            </button>
          </div>
        </section>
        )}
        

        <div className="space-y-6">
          {/* 1. MODUL: USER FEED (REPORTS) */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">User-Feed & Meldungen</h3>
                <p className="text-[10px] text-orange-500 mt-1 font-bold uppercase tracking-wider">{userReports.length} Ungeprüfte Einträge</p>
              </div>
              {userReports.length > 0 && <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black">NEU</div>}
            </div>
            <div className="grid gap-3">
              {userReports.length === 0 && <p className="text-center py-10 bg-slate-50 rounded-3xl text-xs text-slate-300 italic font-light">Keine neuen Meldungen.</p>}
              {userReports.map((r) => (
                <div key={r.id} onClick={() => { setSelectedReport(r); setActiveLightbox('admin'); }} className="bg-slate-50 border border-slate-100 p-5 rounded-3xl shadow-sm hover:border-blue-300 transition-all cursor-pointer group flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">
                      {r.image_urls?.[0] ? <img src={r.image_urls[0]} className="w-full h-full object-cover" /> : "INFO"}
                    </div>
                    <div>
                      <p className="text-xs text-slate-700 font-bold text-blue-600">{r.reporter_name || 'Anonym'} <span className="text-slate-400 font-normal mx-1">• {new Date(r.created_at).toLocaleDateString()}</span></p>
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic mt-0.5">"{r.description}"</p>
                    </div>
                  </div>
                  <div className="bg-white p-2 rounded-xl text-slate-300 group-hover:text-blue-500 transition-all">→</div>
                </div>
              ))}
            </div>
          </section>

          {/* 2. MODUL: MÄNGELLISTE (DEFECTS) */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6">
  <div className="flex justify-between items-center border-b border-slate-50 pb-6">
    <div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Offizielle Mängelliste</h3>
      <p className="text-[10px] text-red-500 mt-1 font-bold uppercase tracking-wider">{defects.length} Offene Mängel</p>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
        <button onClick={() => setEditMode('admin')} className={`p-2 px-4 rounded-xl transition-all flex items-center gap-2 ${editMode === 'admin' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>
          <span className="text-sm">⚙️</span>
        </button>
        <button onClick={() => setEditMode('repair')} className={`p-2 px-4 rounded-xl transition-all flex items-center gap-2 ${editMode === 'repair' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-400'}`}>
          <span className="text-sm">🔧</span>
        </button>
      </div>
      <button onClick={() => router.push(`/ferrata/${id}/defect`)} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm">MANGEL ERFASSEN +</button>
    </div>
  </div>

  <div className="grid gap-3">
    {defects.length === 0 && <p className="text-center py-10 bg-slate-50 rounded-3xl text-xs text-slate-300 italic font-light">Keine offiziellen Mängel.</p>}
    {defects.map((d) => {
      const styles = getPriorityStyles(d.priority);
      const isExpanded = !!expandedDefects[d.id]; // Sicherstellen, dass es ein boolean ist
      const hasChildren = d.children && d.children.length > 0;

      return (
        <div key={d.id} className="space-y-2">
          {/* HAUPTKARTE (MASTER) */}
          <div onClick={() => { setSelectedReport(d); setActiveLightbox(editMode); }} 
               className={`bg-slate-50 border ${isExpanded ? 'border-blue-200' : 'border-slate-100'} rounded-3xl p-6 flex items-center gap-6 hover:border-blue-300 transition-all cursor-pointer group`}>
            <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${styles.bar}`}></div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-4 items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mangel</p>
                  <h4 className="text-sm font-black text-slate-900 line-clamp-1">{d.title || d.type}</h4>
                </div>
                
                {/* GRUPPIERUNGS BADGE */}
                {hasChildren && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedDefects((prev: Record<string, boolean>) => ({ ...prev, [d.id]: !prev[d.id] }));
                    }}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1.5 transition-all shadow-sm ${isExpanded ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'}`}
                  >
                    <span className="text-[10px] font-black">{d.children.length + 1}</span>
                    <span className="text-[8px] font-black uppercase">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                )}
              </div>
              
              <div className="hidden md:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Erfasst am</p>
                <p className="text-xs font-bold text-slate-600">{new Date(d.created_at).toLocaleDateString('de-DE')}</p>
              </div>

              <div className="hidden md:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Verifiziert von</p>
                <p className="text-[10px] font-medium text-blue-600 truncate">{d.verified_by_name || 'System'}</p>
              </div>

              <div className="md:text-right">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border shadow-sm ${styles.badge}`}>
                  {d.priority || 'niedrig'}
                </span>
              </div>
            </div>
            <div className="text-slate-200 text-xl group-hover:text-blue-500 transition-colors">→</div>
          </div>

          {/* UNTERGEORDNETE MELDUNGEN */}
          {isExpanded && hasChildren && (
            <div className="ml-14 space-y-2 animate-in slide-in-from-top-2 duration-300">
              {d.children.map((child: any, idx: number) => (
                <div key={child.id} className="bg-white/60 border border-slate-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                  <div className="text-slate-300 font-bold text-xs">└</div>
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                    {child.image_urls?.[0] ? (
                      <img src={child.image_urls[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-300 font-black">FOTO</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Meldung {idx + 1} • {new Date(child.created_at).toLocaleDateString()}</p>
                    <p className="text-[11px] text-slate-600 font-medium line-clamp-1 italic">"{child.description}"</p>
                  </div>
                  <div className="text-[9px] font-black text-slate-400 uppercase px-2">{child.reporter_name || 'Anonym'}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    })}
  </div>
          </section>

          {/* 3. MODUL: HISTORY */}
          <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b pb-6">Wartungshistorie</h3>
            <div className="space-y-4 border-l-2 border-slate-100 ml-4 pl-8 relative">
              <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-4 mb-6 tracking-widest">Wartungshistorie & Audit-Log</h3>
                <div className="space-y-4 border-l-2 border-slate-100 ml-4 pl-8 relative">
                  {history.map((log, i) => (
                    
                    <div key={i} className="relative mb-8 last:mb-0">
                      {/* Punkt auf der Timeline: Blau für Status/Log, Orange für Reparatur */}
                      <div className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 shadow-sm ${
                        log.type === 'repair' ? 'border-orange-500' : 'border-blue-500'
                      }`}></div>
                      
                      <div className="bg-slate-50 border border-slate-50 rounded-3xl p-5 shadow-sm hover:border-slate-200 transition-all">
                        <div className="flex justify-between items-start mb-2">
                          <time className="text-[10px] font-black text-slate-400 uppercase">
                            <time className="text-[10px] font-black text-slate-400 uppercase">
                              {new Date(log.date).toLocaleString('de-DE', { 
                                day: '2-digit', 
                                month: '2-digit', 
                                year: 'numeric', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })} Uhr
                            </time>
                          </time>
                          
                          {/* Typ-Badge */}
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                            log.log_type === 'status_change' 
                              ? 'bg-blue-100 text-blue-600 border-blue-200' 
                              : 'bg-white text-slate-400 border-slate-200'
                          }`}>
                            {log.log_type === 'status_change' ? '📢 Status-Änderung' : '📝 Protokoll'}
                          </span>
                        </div>
                        
                        <p className="text-sm font-medium text-slate-700 leading-relaxed">{log.description}</p>
                        
                        {/* Urheber-Zeile */}
                        <div className="mt-3 pt-3 border-t border-slate-100/50 flex items-center gap-2">
                          <div className="w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px]">👤</div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            Aktion durch: <span className="text-slate-600">{log.user_name || 'System / Unbekannt'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>



        </div>
      </div>

      {/* LIGHTBOX ADMIN / SETUP */}
{activeLightbox === 'admin' && selectedReport && (
  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
    <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
      <div className="p-8 border-b border-slate-50 flex justify-between items-start bg-white z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{selectedReport.priority ? "Eintrag bearbeiten" : "Meldung prüfen"}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-400 font-black">
            {new Date(selectedReport.created_at).toLocaleDateString()} • {selectedReport.reporter_name}
            {selectedReport.reporter_email && <p className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">✉️ {selectedReport.reporter_email}</p>}
            {selectedReport.reporter_phone && <p className="text-[9px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">📞 {selectedReport.reporter_phone}</p>}
          </div>
        </div>
        <button onClick={() => setActiveLightbox(null)} className="text-slate-300 hover:text-slate-900 text-3xl transition-colors leading-none">×</button>
      </div>

      <div className="overflow-y-auto p-8 space-y-8">
        
        {/* Container für Bilder und Topo */}
        <div className={`grid grid-cols-1 ${topoUrl ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Schadensfotos</p>
            <div className={`grid ${topoUrl ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
              {selectedReport.image_urls?.map((url: string, idx: number) => (
                <div key={idx} onClick={() => openGallery(idx)} className="rounded-3xl overflow-hidden border border-slate-100 bg-slate-50 aspect-square cursor-zoom-in shadow-sm">
                  <img src={url} className="w-full h-full object-cover" alt={`Schaden ${idx + 1}`} />
                </div>
              ))}
            </div>
          </div>

          {topoUrl && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verortung im Topo</p>
              <div className="flex justify-center bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden min-h-[200px] items-center">
                <div onClick={() => openGallery('topo')} className="relative inline-block cursor-zoom-in">
                  <img 
                    src={topoUrl} 
                    className="max-h-[300px] w-auto object-contain" 
                    alt="Topo" 
                    onError={(e) => (e.currentTarget.style.display = 'none')} 
                  />
                  {selectedReport.topo_x && (
                    <div 
                      className="absolute w-2.5 h-2.5 bg-red-600 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-xl" 
                      style={{ left: `${selectedReport.topo_x}%`, top: `${selectedReport.topo_y}%` }} 
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Kategorie & Ort</p>
            <div className="flex items-center gap-2 mb-2"><span className="text-lg">{selectedReport.type === 'Anchor' ? '🔩' : '🪢'}</span><p className="text-sm font-bold text-slate-800 uppercase">{selectedReport.type}</p></div>
            <p className="text-xs font-medium text-slate-600">📍 {selectedReport.location || 'N/A'}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Geodaten & Höhe</p>
            <p className="text-[10px] font-mono font-bold text-slate-700 bg-white/50 px-2 py-1 rounded-lg border border-slate-200 inline-block">{selectedReport.coordinates || 'N/A'}</p>
            <p className="text-[10px] text-blue-600 font-black block mt-1 uppercase">{selectedReport.altitude ? `${selectedReport.altitude} M ü.M.` : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-blue-50/30 border border-blue-100 rounded-[2rem] p-6 text-sm text-slate-700 italic leading-relaxed">"{selectedReport.description}"</div>

        {/* NEUE SEKTION: ZUORDNUNG ZU BESTEHENDEM MANGEL */}
        {!selectedReport.priority && defects.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Bestehendem Mangel zuordnen (Duplikat)</span>
              <div className="h-[1px] flex-1 bg-slate-50"></div>
            </div>
            <div className="grid gap-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin">
              {defects.map((d) => (
                <button 
                  key={d.id}
                  onClick={() => handleAttachToDefect(selectedReport, d.id)}
                  className="flex items-center justify-between p-4 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 rounded-2xl transition-all group"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <div className={`w-1 h-3 rounded-full ${d.priority === 'kritisch' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                      <p className="text-xs font-black text-slate-800">{d.title || d.type}</p>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5 ml-3 italic">{d.location || 'Ortsangabe fehlt'}</p>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all text-[9px] font-black text-orange-600 border border-orange-100">
                    HINZUFÜGEN +
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-6 pt-4 border-t border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4">Offizieller Titel *</label>
              <input type="text" value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="Titel..." />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Interne Anweisung</label>
              <textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm min-h-[80px] focus:bg-white focus:border-blue-500 outline-none transition-all" placeholder="Anweisung..." />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['niedrig', 'mittel', 'hoch', 'kritisch'].map((p) => {
               const s = getPriorityStyles(p);
               return <button key={p} onClick={() => setTempPrio(p)} className={`py-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${tempPrio === p ? `${s.bar} text-white shadow-xl scale-105` : 'bg-white border-slate-50 text-slate-300'}`}>{p}</button>
            })}
          </div>
        </div>
      </div>

      <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
        <button onClick={() => handleAction('discard')} className="flex-1 py-4 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-all">LÖSCHEN</button>
        <button onClick={() => handleAction('verify')} disabled={!adminTitle.trim() || !tempPrio} className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${(!adminTitle.trim() || !tempPrio) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100'}`}>{selectedReport.priority ? "AKTUALISIEREN" : "ÜBERNEHMEN"}</button>
      </div>
    </div>
  </div>
)}

      {/* LIGHTBOX REPAIR / WORK */}
      {activeLightbox === 'repair' && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border-2 border-orange-500/20">
            <div className="p-8 border-b border-orange-50 flex justify-between items-start bg-orange-50/30">
              <div>
                <h2 className="text-xl font-bold text-orange-900 flex items-center gap-2"><span>🔧</span> Reparatur dokumentieren</h2>
                <p className="text-[10px] text-orange-600 font-black uppercase mt-1 tracking-widest">Mangel: {selectedReport.title || selectedReport.type}</p>
              </div>
              <button onClick={() => setActiveLightbox(null)} className="text-3xl text-orange-300">×</button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Arbeitszeit</label>
                    <input type="text" value={repairTime} onChange={(e) => setRepairTime(e.target.value)} placeholder="z.B. 1.5 Std" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-orange-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Material</label>
                    <textarea value={repairMaterial} onChange={(e) => setRepairMaterial(e.target.value)} placeholder="Verwendetes Material..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[100px] focus:border-orange-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Reparaturbericht</label>
                  <textarea value={repairReport} onChange={(e) => setRepairReport(e.target.value)} placeholder="Was wurde genau gemacht?" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold min-h-[188px] focus:border-orange-500 outline-none" />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Ergebnis-Fotos (Nachher)</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {repairImages.map((file, idx) => (
                    <div key={idx} className="relative aspect-square rounded-3xl overflow-hidden border border-orange-100 group">
                      <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Vorschau" />
                      <button onClick={() => setRepairImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                    </div>
                  ))}
                  <label className="aspect-square border-2 border-dashed border-orange-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-all text-orange-400 hover:text-orange-600">
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageSelect} />
                    <span className="text-3xl mb-1">📸</span>
                    <span className="text-[9px] font-black uppercase">Foto hinzufügen</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
              <button onClick={() => setActiveLightbox(null)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abbrechen</button>
              <button onClick={handleRepairComplete} disabled={uploading || !repairReport} className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${uploading ? 'bg-slate-300 animate-pulse' : 'bg-orange-600 text-white shadow-orange-100'}`}>{uploading ? 'Wird gespeichert...' : 'Reparatur abschließen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN IMAGE OVERLAY */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[200] bg-slate-900/98 flex items-center justify-center p-4 animate-in fade-in" onClick={() => {setFullScreenImage(null); setIsGalleryTopo(false);}}>
          <button className="absolute top-6 right-6 text-white text-5xl font-light p-4 z-[210] hover:text-blue-400 transition-colors">×</button>
          <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            <img src={fullScreenImage} className="max-w-[95vw] max-h-[85vh] object-contain shadow-2xl rounded-lg border border-white/10" alt="Vollbild" />
            {isGalleryTopo && selectedReport?.topo_x && <div className="absolute w-3 h-3 bg-red-600 border-2 border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-2xl" style={{ left: `${selectedReport.topo_x}%`, top: `${selectedReport.topo_y}%` }} />}
          </div>
        </div>
      )}
    </main>
  );
}