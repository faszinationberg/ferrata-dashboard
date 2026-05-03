"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '../../../../lib/supabase';
import { CloudStatusBadge } from '../../../components/CloudStatusBadge';
import { DefectReportForm } from '../../../components/InternaDefectReport';
import { FerrataStatusBadge } from '../../../components/FerrataStatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useImageManager } from '../../../hooks/useImageManager'; 
import { ImageManager } from '../../../components/ImageManager';
import { priorityStyles, PriorityType } from '../../../../lib/priorityConfig';

export default function MaintenanceCenter() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const { userRole, userEmail, loading: authLoading } = useAuth();

  // IMAGE MANAGER HOOK
  const { 
    newFiles, 
    isUploading, 
    handleImageSelect: handleManagerImageSelect, 
    removeNewFile, 
    clearNewFiles, 
    uploadImages 
  } = useImageManager(id);

  // --- 1. STATES ---
  const [loading, setLoading] = useState(true);
  const [ferrata, setFerrata] = useState<any>(null);
  const [defects, setDefects] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedDefects, setExpandedDefects] = useState<Record<string, boolean>>({});

  // Reparatur-Dokumentations States
  const [repairTime, setRepairTime] = useState('');
  const [repairMaterial, setRepairMaterial] = useState('');
  const [repairReport, setRepairReport] = useState('');

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
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);

  // --- 2. DERIVED CONSTANTS ---
  const topoUrl = ferrata?.topo_url || null;

  const openGallery = (index: number | 'topo') => {
    if (index === 'topo') {
      setFullScreenImage(topoUrl);
    } else if (selectedReport?.image_urls) {
      setFullScreenImage(selectedReport.image_urls[index as number]);
    }
  };

  // --- 4. DATA FETCHING ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ferrataData } = await supabase.from('ferratas').select('name, status, topo_url').eq('id', id).single();
      const { data: reportsData } = await supabase.from('reports').select('*').eq('ferrata_id', id).eq('verified', false).is('parent_defect_id', null).order('created_at', { ascending: false });
      const { data: allLinked } = await supabase.from('reports').select('*').eq('ferrata_id', id).not('parent_defect_id', 'is', null);
      const { data: defectsData } = await supabase.from('defects').select('*').eq('ferrata_id', id).eq('resolved', false);
      
      const { data: logsData } = await supabase.from('maintenance_logs').select('*').eq('ferrata_id', id);
      const { data: resolvedDefects } = await supabase.from('defects').select('*').eq('ferrata_id', id).eq('resolved', true);
      const { data: inspectionsData } = await supabase.from('inspections').select('*').eq('ferrata_id', id);

      if (ferrataData) setFerrata(ferrataData);
      if (reportsData) setUserReports(reportsData);
      if (defectsData) {
        setDefects(defectsData.map(d => ({ 
          ...d, 
          children: allLinked?.filter(r => r.parent_defect_id === d.id) || [] 
        }))
        .sort((a, b) => (priorityStyles[a.priority as PriorityType]?.rank || 99) - (priorityStyles[b.priority as PriorityType]?.rank || 99)));
      }

      const combinedHistory = [
        ...(logsData || []).map(log => ({
          date: log.date.includes('T') ? log.date : log.created_at, 
          description: log.description,
          type: 'log',
          log_type: log.log_type,
          user_name: log.user_name,
          id: log.id
        })),
        ...(resolvedDefects || []).map(d => ({
          date: d.resolved_at || d.created_at, 
          description: `REPARATUR ERLEDIGT: ${d.title || d.type}${d.repair_report ? ` — ${d.repair_report}` : ''}`,
          type: 'repair',
          log_type: 'repair',
          priority: d.priority, 
          user_name: d.verified_by_name,
          id: d.id,
          material: d.repair_material
        })),
        ...(inspectionsData || []).map(insp => ({
          date: insp.date,
          description: `JAHRESINSPEKTION DURCHGEFÜHRT: Zustand: ${insp.condition_rating}. ${insp.summary_report}`,
          type: 'inspection',
          log_type: 'inspection',
          user_name: 'Techniker',
          id: insp.id,
          is_safe: insp.is_safe,
          is_public: insp.is_publicly_released
        }))
      ];

      setHistory(combinedHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) { console.error("Fetch Error:", err); } 
    finally { setLoading(false); }
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
  const handleAttachToDefect = async (report: any, masterDefectId: string) => {
    try {
      const { data: masterDefect } = await supabase.from('defects').select('image_urls, report_count').eq('id', masterDefectId).single();
      if (!masterDefect) return;

      await supabase.from('reports').update({ parent_defect_id: masterDefectId, verified: true }).eq('id', report.id);
      const uniqueImages = Array.from(new Set([...(masterDefect.image_urls || []), ...(report.image_urls || [])]));

      await supabase.from('defects').update({ 
        image_urls: uniqueImages, 
        report_count: (masterDefect.report_count || 1) + 1 
      }).eq('id', masterDefectId);

      await fetchData(); 
      setActiveLightbox(null);
      setSelectedReport(null);
    } catch (err) { console.error(err); }
  };

  const handleAction = async (action: 'verify' | 'discard') => {
    if (!selectedReport) return;

    if (action === 'discard') {
      if (!confirm("Eintrag wirklich entfernen?")) return;
      const table = selectedReport.priority ? 'defects' : 'reports';
      await supabase.from(table).delete().eq('id', selectedReport.id);
      await fetchData();
      setSelectedReport(null);
      setActiveLightbox(null);
    } else {
      if (!adminTitle.trim() || !tempPrio) return alert("Bitte Titel und Priorität festlegen.");
      setLoading(true);
      try {
        const newUploadedUrls = await uploadImages('admin_verification');
        const finalImageUrls = [...(selectedReport.image_urls || []), ...newUploadedUrls];

        if (defects.find(d => d.id === selectedReport.id)) {
          await supabase.from('defects').update({ title: adminTitle, priority: tempPrio, internal_comment: adminComment, image_urls: finalImageUrls }).eq('id', selectedReport.id);
        } else {
          const { data: userData } = await supabase.auth.getUser();
          await supabase.from('defects').insert([{
            ferrata_id: id, title: adminTitle, internal_comment: adminComment, priority: tempPrio,
            image_urls: finalImageUrls, type: selectedReport.type, location: selectedReport.location, 
            verified_by_name: userEmail, verified_at: new Date().toISOString()
          }]);
          await supabase.from('reports').delete().eq('id', selectedReport.id);
        }
        clearNewFiles();
        await fetchData();
        setSelectedReport(null);
        setActiveLightbox(null);
      } catch (err: any) { alert(err.message); } 
      finally { setLoading(false); }
    }
  };

  const handleRepairComplete = async () => {
    if (!selectedReport || isUploading) return;
    if (!repairReport.trim()) return alert("Bitte Bericht ausfüllen.");
    
    setLoading(true);
    try {
      const uploadedUrls = await uploadImages('repairs');
      await supabase.from('defects').update({
          repair_time: repairTime, repair_material: repairMaterial, repair_report: repairReport,
          repair_image_urls: uploadedUrls, resolved: true, resolved_at: new Date().toISOString()
      }).eq('id', selectedReport.id);

      await supabase.from('maintenance_logs').insert([{
        ferrata_id: id, log_type: 'repair', user_name: userEmail, date: new Date().toISOString(),
        description: `REPARATUR: ${selectedReport.title || selectedReport.type}. Material: ${repairMaterial}`
      }]);

      clearNewFiles();
      setRepairTime(''); setRepairMaterial(''); setRepairReport('');
      setActiveLightbox(null); setSelectedReport(null);
      await fetchData();
    } catch (err: any) { alert(err.message); } 
    finally { setLoading(false); }
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
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl space-y-6 relative overflow-hidden group">
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
          <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
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
          <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-6">
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
                  <button onClick={() => setIsDefectModalOpen(true)} // NEU: Öffnet das Modal statt Navigation
                  className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm">
                  MANGEL ERFASSEN +
                </button>
              </div>
            </div>

            <div className="grid gap-3">
              {defects.length === 0 && <p className="text-center py-10 bg-slate-50 rounded-3xl text-xs text-slate-300 italic font-light">Keine offiziellen Mängel.</p>}
              {defects.map((d) => {
                // Zugriff auf die zentrale Config (Fallback auf 'niedrig', falls mal was fehlt)
                const styles = priorityStyles[d.priority as PriorityType] || priorityStyles.niedrig;
                const isExpanded = !!expandedDefects[d.id];
                const hasChildren = d.children && d.children.length > 0;

                return (
                  <div key={d.id} className="space-y-2">
                    {/* HAUPTKARTE (MASTER) */}
                    <div onClick={() => { setSelectedReport(d); setActiveLightbox(editMode); }} 
                        className={`bg-slate-50 border ${isExpanded ? 'border-blue-200' : 'border-slate-100'} rounded-3xl p-6 flex items-center gap-6 hover:border-blue-300 transition-all cursor-pointer group`}>
                      <div className={`w-1.5 h-12 rounded-full flex-shrink-0 ${styles.bg}`}></div>  

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
          <section className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-4 mb-8 tracking-[0.2em]">
              Wartungshistorie & Audit-Log
            </h3>

            <div className="space-y-2 border-l-2 border-slate-100 ml-4 pl-8 relative">
              {/* Innerhalb von history.map im JSX */}
              {history.map((log, i) => {
                const isInspection = log.log_type === 'inspection' || log.type === 'inspection';
                const isStatus = log.log_type === 'status_change';
                const isRepair = log.type === 'repair' || log.log_type === 'repair';

                // Standard-Werte (Fallback)
                let dotColor = 'border-blue-500';
                let badgeClass = 'bg-slate-100 text-slate-400 border-slate-200';
                let icon = '📝';
                let typeLabel = 'Protokoll';

                if (isInspection) {
                  dotColor = 'border-emerald-500';
                  badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                  icon = '🛡️';
                  typeLabel = 'Jahresinspektion';
                } else if (isStatus) {
                  dotColor = 'border-blue-500';
                  badgeClass = 'bg-blue-50 text-blue-600 border-blue-100';
                  icon = '📢';
                  typeLabel = 'Status-Update';
                } else if (isRepair) {
                  // SICHERHEITS-CHECK: Wir holen den Style nur, wenn die Prio existiert
                  // Falls nicht, nutzen wir 'niedrig' als Standard-Look
                  const priorityKey = (log.priority?.toLowerCase() as PriorityType) || 'niedrig';
                  const pStyle = priorityStyles[priorityKey] || priorityStyles.niedrig;
                  
                  dotColor = pStyle.border; 
                  badgeClass = pStyle.badge;
                  icon = '🔧';
                  typeLabel = 'Reparatur';
                }

                return (
                  <div key={i} className="relative mb-8 last:mb-0 group">
                    {/* Punkt auf der Timeline */}
                    <div className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full bg-white border-4 shadow-sm transition-transform group-hover:scale-125 ${dotColor}`}></div>
                    
                    {/* Ab hier folgt der Rest deines UI-Codes (Cards etc.) */}
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-6 transition-all hover:bg-white hover:shadow-md hover:border-slate-200">
                      <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
                        <time className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          {log.date ? new Date(log.date).toLocaleString('de-DE', { 
                            day: '2-digit', month: '2-digit', year: 'numeric', 
                            hour: '2-digit', minute: '2-digit' 
                          }) + " Uhr" : "Datum unbekannt"}
                        </time>
                        
                        <div className="flex gap-2">
                          {isInspection && (
                            <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase border ${log.is_safe ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-red-500 text-white border-red-600'}`}>
                              {log.is_safe ? 'Sicher' : 'Mangelhaft'}
                            </span>
                          )}
                          
                          <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase border ${badgeClass} flex items-center gap-1.5`}>
                            <span>{icon}</span>
                            {typeLabel}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-4">
                        {log.description}
                      </p>
                      
                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] grayscale">👤</div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            Aktion durch: <span className="text-slate-600 font-black">{log.user_name || 'Techniker'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>

      {/* LIGHTBOX ADMIN / SETUP */}
      {activeLightbox === 'admin' && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            {/* HEADER (Unverändert) */}
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
              
              {/* 1. TOPO VERORTUNG (Bleibt oben) */}
              {topoUrl && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Verortung im Topo</p>
                  <div className="flex justify-center bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden min-h-[200px] items-center relative group">
                    <div onClick={() => openGallery('topo')} className="relative inline-block cursor-zoom-in group-hover:scale-[1.01] transition-transform">
                      <img 
                        src={topoUrl} 
                        className="max-h-[300px] w-auto object-contain" 
                        alt="Topo" 
                        onError={(e) => (e.currentTarget.style.display = 'none')} 
                      />
                      {selectedReport.topo_x && (
                        <div 
                          className="absolute w-2.5 h-2.5 bg-red-600 border border-white rounded-full -translate-x-1/2 -translate-y-1/2 shadow-xl animate-pulse" 
                          style={{ left: `${selectedReport.topo_x}%`, top: `${selectedReport.topo_y}%` }} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. BASIS-DATEN (Kategorie, Ort, Geodaten) */}
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

              {/* 3. USER BESCHREIBUNG */}
              <div className="bg-blue-50/30 border border-blue-100 rounded-[2rem] p-6 text-sm text-slate-700 italic leading-relaxed">"{selectedReport.description}"</div>

              {/* 4. DUPLIKAT-ZUORDNUNG */}
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

              {/* 5. BILDVERWALTUNG (Hierhin verschoben, vor den Titel) */}
              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-end px-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mangel-Dokumentation (Bilder)
                  </p>
                  <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    Bilder verwalten
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2 relative">
                  <ImageManager 
                    existingUrls={selectedReport.image_urls || []}
                    newFiles={newFiles}
                    onRemoveExisting={(url) => {
                      // Temporäres Entfernen im State der Lightbox
                      setSelectedReport({
                        ...selectedReport,
                        image_urls: selectedReport.image_urls.filter((u: string) => u !== url)
                      });
                    }}
                    onRemoveNew={removeNewFile}
                    onSelect={handleManagerImageSelect}
                  />
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-[2rem] z-10">
                      <p className="text-xs text-blue-600 font-bold animate-pulse">
                        Bilder werden verarbeitet...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 6. ADMIN INPUTS (Titel, Kommentar, Priorität) */}
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
                  {(Object.keys(priorityStyles) as PriorityType[]).map((p) => {
                    const style = priorityStyles[p];
                    const isActive = tempPrio === p;
                    
                    return (
                      <button 
                        key={p} 
                        onClick={() => setTempPrio(p)} 
                        className={`py-3 rounded-2xl text-[9px] font-black uppercase border transition-all ${
                          isActive 
                            ? `${style.bg} ${style.text} ${style.border} shadow-xl scale-105 ${style.animate || ''}` 
                            : 'bg-white border-slate-50 text-slate-300 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS (Unverändert) */}
            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
              <button onClick={() => handleAction('discard')} className="flex-1 py-4 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-all">LÖSCHEN</button>
              <button 
                onClick={() => handleAction('verify')} 
                disabled={!adminTitle.trim() || !tempPrio} 
                className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${(!adminTitle.trim() || !tempPrio) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-100'}`}
              >
                {selectedReport.priority ? "AKTUALISIEREN" : "ÜBERNEHMEN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX REPAIR / WORK */}
      {activeLightbox === 'repair' && selectedReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col border-2 border-orange-500/20">
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

              {/* REPARATUR-FOTOS (NACHHER) */}
              <div className="space-y-2">
                <div className="flex justify-between items-end px-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Reparatur-Ergebnis (Nachher-Fotos)
                  </p>
                  <span className="text-[9px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full">
                    Beweisaufnahme
                  </span>
                </div>

                <div className="bg-slate-50 border border-orange-100 rounded-2xl p-2 relative">
                  <ImageManager 
                    existingUrls={[]} // Bei einer neuen Reparatur-Doku starten wir immer leer
                    newFiles={newFiles}
                    onRemoveExisting={() => {}} 
                    onRemoveNew={removeNewFile}
                    onSelect={handleManagerImageSelect}
                  />
                  
                  {isUploading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-[2rem] z-10">
                      <p className="text-xs text-orange-600 font-bold animate-pulse">
                        Bilder werden hochgeladen...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-50 bg-slate-50 flex gap-4">
              <button onClick={() => setActiveLightbox(null)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Abbrechen</button>
              <button onClick={handleRepairComplete} disabled={isUploading || !repairReport} className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${isUploading}`}>{isUploading ? 'Wird gespeichert...' : 'Reparatur abschließen'}</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FÜR MANUELLE MANGEL-ERFASSUNG --- */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => setIsDefectModalOpen(false)} />
          
          {/* Modal Box */}
          <div className="bg-[#fafafa] w-full max-w-xl rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white flex-shrink-0">
              <div>
                <h3 className="font-black uppercase text-[10px] text-slate-400 tracking-widest">Neuer Mangel</h3>
                <p className="text-sm font-bold text-slate-900">{ferrata?.name || 'Manuelle Erfassung'}</p>
              </div>
              <button 
                onClick={() => setIsDefectModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 hover:text-slate-900 transition-colors">
                ✕
              </button>
            </div>
            
            {/* Scrollbarer Inhalt mit der Formular-Komponente */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
              <DefectReportForm 
                ferrataId={id}
                ferrataName={ferrata?.name}
                topoUrl={ferrata?.topo_url}
                onClose={() => setIsDefectModalOpen(false)}
                onSuccess={() => {
                  fetchData(); // Lädt die Mängelliste im Hintergrund sofort neu
                  setIsDefectModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}