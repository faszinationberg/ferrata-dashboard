"use client";

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase'; 

import { CloudStatusBadge } from '../../components/CloudStatusBadge';
import { FerrataStatusBadge } from '../../components/FerrataStatusBadge';
import { useAuth } from '../../hooks/useAuth'; // Falls du die Rolle für Logik brauchst

// Interface für die Profile (falls noch nicht vorhanden)
interface OwnerProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

export default function FerrataDetails() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showTopoModal, setShowTopoModal] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [ferrata, setFerrata] = useState<any>(null);
  const [defects, setDefects] = useState<any[]>([]);
  const [users, setUsers] = useState<OwnerProfile[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [isGlobalEdit, setIsGlobalEdit] = useState(false);
  const [isGeoEdit, setIsGeoEdit] = useState(false);
  const [isTechEdit, setIsTechEdit] = useState(false);
  const [isHeaderEdit, setIsHeaderEdit] = useState(false);
  const [isDocEdit, setIsDocEdit] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [owners, setOwners] = useState<OwnerProfile[]>([]);

 // const { userRole } = useAuth(); // Nur wenn du userRole für "if (userRole === 'dev')" brauchst
  const { userRole, loading: authLoading } = useAuth(); // 'loading' als 'authLoading' umbenennen

  const [lightbox, setLightbox] = useState<{ open: boolean, images: string[], index: number }>({
  open: false,
  images: [],
  index: 0
  
});

useEffect(() => {
  // Wenn der User eingeloggt ist und ein Developer ist, lade die Liste
  if (userRole === 'developer') {
    fetchOwners();
  }
}, [userRole]); // Wird ausgeführt, sobald die Rolle feststeht

const removeDocument = async (index: number) => {
  if (!confirm("Dokument unwiderruflich löschen?")) return;
  
  const newList = ferrata.docs.filter((_: any, i: number) => i !== index);
  await updateField('docs', newList);
};

const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  const newDocs = [];
  for (const file of Array.from(files)) {
    const fileExt = file.name.split('.').pop();
    const filePath = `docs/${id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('topos').upload(filePath, file);
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('topos').getPublicUrl(filePath);
      newDocs.push({ 
        url: publicUrl, 
        name: file.name, 
        created_at: new Date().toISOString() 
      });
    }
  }

  const updatedDocs = [...(ferrata.docs || []), ...newDocs];
  await updateField('docs', updatedDocs);
};

// Hilfsfunktionen für den Wechsel
const nextImg = () => setLightbox(prev => ({ ...prev, index: (prev.index + 1) % prev.images.length }));
const prevImg = () => setLightbox(prev => ({ ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length }));

const removeElementImage = async (elementIndex: number, imageIndex: number) => {
  if (!confirm("Möchtest du dieses Foto wirklich entfernen?")) return;

  // 1. Tiefe Kopie des special_elements Arrays erstellen
  const newList = JSON.parse(JSON.stringify(ferrata.special_elements || []));
  
  // 2. Prüfen, ob das Element und das Bilder-Array existieren
  if (newList[elementIndex] && newList[elementIndex].images) {
    // 3. Das Bild an der entsprechenden Stelle entfernen
    newList[elementIndex].images.splice(imageIndex, 1);
    
    // 4. Update der Datenbank und des lokalen States über die updateField Funktion
    // WICHTIG: Wir nutzen updateField, um den lokalen State OHNE Seiten-Refresh zu aktualisieren
    await updateField('special_elements', newList);
  }
};

const uploadElementImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const fileExt = file.name.split('.').pop();
    const filePath = `elements/${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('topos') // Wir nutzen den vorhandenen Bucket
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage.from('topos').getPublicUrl(filePath);

    const newList = [...ferrata.special_elements];
    // Falls noch kein Bilder-Array existiert, erstellen wir eines
    if (!newList[index].images) newList[index].images = [];
    newList[index].images.push(publicUrl);

    updateField('special_elements', newList);
  } catch (err) {
    alert("Fehler beim Bildupload");
  }
};

  const handleTopoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setIsUploading(true);

      // Dateiname generieren (ID + Zeitstempel gegen Cache-Probleme)
      const fileExt = file.name.split('.').pop();
      const fileName = `${ferrata.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload in den Supabase Storage Bucket 'topos'
      const { error: uploadError } = await supabase.storage
        .from('topos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Public URL abrufen
      const { data: { publicUrl } } = supabase.storage
        .from('topos')
        .getPublicUrl(filePath);

      // 3. URL in der 'ferratas' Tabelle speichern
      await updateField('topo_url', publicUrl);
      
      alert("Topo erfolgreich hochgeladen!");
    } catch (error) {
      console.error('Upload Fehler:', error);
      alert("Fehler beim Upload.");
    } finally {
      setIsUploading(false);
    }
  };

  const addSpecialElement = () => {
  const newList = [...(ferrata.special_elements || []), { type: '3-Seilbrücke', length: '', description: '', images: [] }];
  updateField('special_elements', newList);
};

const updateSpecialElement = async (index: number, field: string, value: any) => {
  // 1. Lokale Kopie erstellen
  const newList = [...(ferrata.special_elements || [])];
  
  // 2. Wert im Array anpassen
  newList[index] = { ...newList[index], [field]: value };
  
  // 3. UI sofort aktualisieren (kein Springen!)
  setFerrata({ ...ferrata, special_elements: newList });

  // 4. In der DB speichern (asynchron im Hintergrund)
  const { error } = await supabase
    .from('ferratas')
    .update({ special_elements: newList })
    .eq('id', id);

  if (error) {
    console.error("Speicherfehler:", error);
  }
};

const removeSpecialElement = (index: number) => {
  if(!confirm("Element wirklich löschen?")) return;
  const newList = ferrata.special_elements.filter((_:any, i:number) => i !== index);
  updateField('special_elements', newList);
};

const fetchOwners = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('role', 'betreiber') // Wir filtern nur nach Betreibern
      .eq('is_active', true) // Optional: Nur aktive Nutzer anzeigen
      .order('full_name', { ascending: true });

    if (error) throw error;
    if (data) setOwners(data);
  } catch (error) {
    console.error('Fehler beim Laden der Betreiber:', error);
  }
};

const fetchData = async () => {
  if (authLoading || !userRole) return;

  setLoading(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Ferrata laden (Basisdaten) - Das funktioniert ja bereits stabil
    let query = supabase.from('ferratas').select('*').eq('id', id);
    if (userRole !== 'developer' && user) {
      query = query.eq('owner_id', user.id);
    }

    const { data: ferrataData, error: ferrataError } = await query.single();

    if (ferrataError || !ferrataData) {
      setFerrata(null);
      setLoading(false);
      return; 
    }

    // --- NEU: ABSICHERUNG DER PROFILE ---

    // 2. Den Namen des aktuell zugewiesenen Betreibers laden (einfacher Einzel-Check)
    if (ferrataData.owner_id) {
      const { data: pData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', ferrataData.owner_id)
        .single();
      ferrataData.profiles = pData; // Setzt den Namen für die Anzeige oben
    } else {
      ferrataData.profiles = null;
    }

    // 3. Wenn Developer: Liste für das Dropdown laden (separat!)
    if (userRole === 'developer') {
      const { data: oData, error: oError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .or('role.eq.betreiber,role.eq.beobachter')
        .eq('is_active', true)
        .order('full_name');
      
      if (!oError && oData) {
        setOwners(oData);
        console.log("Dropdown Liste geladen:", oData.length, "User");
      } else {
        console.error("Fehler beim Laden der Dropdown-Liste:", oError);
      }
    }

    // 4. Reports & Historie (Nebenbei laden)
   // 4. Reports & Historie (Robustes Laden)
const [reportsRes, historyRes] = await Promise.all([
  supabase.from('reports').select('*').eq('ferrata_id', id).eq('resolved', false).order('created_at', { ascending: false }),
  supabase.from('maintenance_logs').select('*').eq('ferrata_id', id).order('date', { ascending: false })
]);

// Falls die DB einen Fehler liefert (der 400er aus deinem Log), 
// setzen wir einfach ein leeres Array statt abzustürzen
if (reportsRes.error) {
  console.warn("Reports konnten nicht geladen werden (RLS?):", reportsRes.error);
  setDefects([]);
} else {
  setDefects(reportsRes.data?.filter((r: any) => r.verified === true) || []);
}

if (historyRes.error) {
  console.warn("Logs konnten nicht geladen werden:", historyRes.error);
  setHistory([]);
} else {
  setHistory(historyRes.data || []);
}

    if (reportsRes.data) setDefects(reportsRes.data.filter((r: any) => r.verified === true));
    if (historyRes.data) setHistory(historyRes.data);

    // Finalen State setzen
    setFerrata(ferrataData);

  } catch (err) {
    console.error("Kritischer Systemfehler:", err);
  } finally {
    setLoading(false);
  }
};

  const verifyReport = async (reportId: string) => {
    const { error } = await supabase.from('reports').update({ verified: true, priority: 'orange' }).eq('id', reportId);
    if (!error) fetchData();
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Meldung wirklich löschen?")) return;
    const { error } = await supabase.from('reports').delete().eq('id', reportId);
    if (!error) fetchData();
  };

  const resolveDefect = async (defect: any) => {
    setLoading(true);
    try {
      await supabase.from('reports').update({ resolved: true, resolved_at: new Date().toISOString() }).eq('id', defect.id);
      await supabase.from('maintenance_logs').insert([{
        ferrata_id: id,
        report_id: defect.id,
        type: 'Reparatur',
        description: `BEHOBEN: ${defect.type} - ${defect.description}`,
        date: new Date().toISOString().split('T')[0],
        performed_by: 'Technik-Team'
      }]);
      fetchData();
    } catch (err: any) { alert(err.message); } finally { setLoading(false); }
  };

  useEffect(() => {
  if (!authLoading) {
    fetchData();
  }
  }, [id, authLoading, userRole]); // Wichtig: authLoading und userRole als Trigger

const handleOwnerChange = async (newOwnerId: string | null) => {
  try {
    // In DB speichern
    await updateField('owner_id', newOwnerId);

    // Den gewählten Betreiber in der Liste suchen
    const selectedOwner = owners.find(o => o.id === newOwnerId);
    
    // UI-State manuell aktualisieren
    setFerrata((prev: any) => ({
      ...prev,
      owner_id: newOwnerId,
      profiles: selectedOwner ? { full_name: selectedOwner.full_name } : null
    }));
  } catch (err) {
    console.error(err);
  }
};

  const updateField = async (field: string, value: any) => {
  // 1. Zuerst lokal den State ändern (UI reagiert sofort)
  setFerrata((prev: any) => ({ ...prev, [field]: value }));

  // 2. Im Hintergrund in Supabase speichern
  const { error } = await supabase
    .from('ferratas')
    .update({ [field]: value })
    .eq('id', id);

  if (error) {
    alert("Fehler beim Speichern");
    // Optional: Hier den State zurückrollen, falls Fehler
  }
  
  // WICHTIG: Vermeide hier router.refresh() oder fetchData(), 
  // wenn es nicht unbedingt nötig ist, da das den Seitensprung auslöst.
};

  const handleUpload = async (e: any, bucket: string, dbField: string) => {
    const file = e.target.files[0];
    if (!file) return;
    const filePath = `${id}/${Date.now()}_${file.name}`;
    const { data: storageData } = await supabase.storage.from(bucket).upload(filePath, file);
    if (storageData) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
      const newItem = { url: urlData.publicUrl, title: file.name, date: new Date().toLocaleDateString() };
      const currentList = Array.isArray(ferrata[dbField]) ? ferrata[dbField] : [];
      await supabase.from('ferratas').update({ [dbField]: [...currentList, newItem] }).eq('id', id);
      fetchData();
    }
  };

  const [isMediaEdit, setIsMediaEdit] = useState(false);

const handleMultipleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files;
  if (!files || files.length === 0) return;

  // Wir wandeln das FileList-Objekt in ein Array um
  const fileArray = Array.from(files);
  
  // Um den UI-Sprung zu vermeiden, laden wir die Bilder hoch und aktualisieren den State am Ende
  const newImageUrls: string[] = [];

  for (const file of fileArray) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `gallery/${id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('topos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('topos').getPublicUrl(filePath);
      newImageUrls.push(publicUrl);
    } catch (err) {
      console.error("Upload Fehler für Datei:", file.name);
    }
  }

  // Update der Datenbank: Bestehende Bilder + neue Bilder
  const updatedGallery = [...(ferrata.images || []), ...newImageUrls.map(url => ({ url, title: '' }))];
  await updateField('images', updatedGallery);
};

const removeImage = (index: number) => {
  if(!confirm("Bild aus der Galerie löschen?")) return;
  const newList = ferrata.images.filter((_: any, i: number) => i !== index);
  updateField('images', newList);
  if (activeImgIndex >= newList.length) setActiveImgIndex(Math.max(0, newList.length - 1));
};


  function VerticalDataField({ label, value, isEditable, onSave }: any) {
    const [isEdit, setIsEdit] = useState(false);

    // Optionen für die Himmelsrichtung
    const expoOptions = ["N", "NO", "O", "SO", "S", "SW", "W", "NW", "N-O", "S-O", "N-W", "S-W"];
    const countryOptions = ["Italien", "Österreich", "Schweiz", "Frankreich", "Deutschland"];

    return (
      <div className="flex flex-col gap-1.5 group">
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          {label}
        </p>
        
        <div className="min-h-[24px] flex items-center">
          {isEditable ? (
            label.toLowerCase().includes("himmelsrichtung") || label.toLowerCase().includes("exposition") ? (
              <select
                className="text-[13px] font-medium text-blue-600 tracking-tight bg-slate-50 border border-blue-200 rounded px-1 outline-none w-full cursor-pointer"
                value={value ?? ''}
                onChange={(e) => onSave(e.target.value)}
              >
                <option value="">Wählen...</option>
                {expoOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <EditableField 
                value={value} 
                onSave={onSave} 
                textClass="text-[13px] font-medium text-blue-600 tracking-tight" 
              />
            )
          ) : (
            <p className="text-[13px] font-medium text-slate-700 tracking-tight px-2">
              {value || '---'}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  // Zuerst prüfen, ob wir noch laden (Auth oder Daten)
  if (loading || authLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-6 h-6 border-2 border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  );

  // ERST DANACH prüfen, ob wirklich keine Daten da sind
  if (!ferrata) return <div className="p-20 text-center text-slate-400 uppercase tracking-widest text-xs">Anlage nicht gefunden oder keine Zugriffsberechtigung.</div>;

//  if (!ferrata) return <div className="p-20 text-center">Anlage nicht gefunden.</div>;

  const displayImages = (ferrata.images && ferrata.images.length > 0) ? ferrata.images : [{ url: ferrata.topo_url || '', title: "Übersicht" }];

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans pb-32">

      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        
        {/* HEADER */}
{/* 1. HEADER ZEILE: Dashboard Link links, Badge rechts */}
      <header className="flex items-center justify-between w-full">
        <button 
          onClick={() => router.push('/dashboard')} 
          className="text-slate-400 hover:text-slate-900 text-xs font-medium transition-all flex items-center gap-2"
        >
          <span className="text-sm">←</span> Dashboard
        </button>
        
        {/* Dein Badge-Container */}
        <CloudStatusBadge /> {/* Einfach hinsetzen, fertig! */}
      </header>

      {/* 2. CONTENT ZEILE: Ab hier fängt die Info-Box an */}
          <div className="bg-white border border-slate-200 rounded-2xl p-8 md:p-10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative group">
            
            {/* EDIT-STIFT FÜR HEADER */}
            { (userRole === 'developer') && (
            <button 
              onClick={() => setIsHeaderEdit(!isHeaderEdit)}
              className={`absolute top-4 right-4 p-2 rounded-lg transition-all z-10 text-xs ${
                isHeaderEdit ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100 opacity-0 group-hover:opacity-100'
              }`}
            >
              {isHeaderEdit ? '✓' : '✎'}
            </button>
            )}

            <div className="space-y-3 w-full md:w-auto">
              {/* LAND */}
              <div className="min-h-[20px]">
                {isHeaderEdit ? (
                  <div className="flex flex-col gap-1">
                    <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Land</p>
                    <select
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600 bg-slate-50 border border-blue-200 rounded outline-none cursor-pointer"
                      value={ferrata.country ?? ''}
                      onChange={(e) => updateField('country', e.target.value)}
                    >
                      <option value="">Land wählen...</option>
                      {["Italien", "Österreich", "Schweiz", "Frankreich", "Deutschland"].map(c => (
                        <option key={c} value={c}>{c.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {ferrata.country || 'KEIN LAND'}
                  </p>
                )}
              </div>

              {/* REGION (jetzt unter Land) */}
              <div className="min-h-[20px]">
                {isHeaderEdit ? (
                  <EditableField 
                    value={ferrata.region} 
                    onSave={(v:string) => updateField('region', v)} 
                    textClass="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600" 
                  />
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
                    {ferrata.region || 'KEINE REGION'}
                  </p>
                )}
              </div>

              {/* NAME */}
              <div className="min-h-[40px]">
                {isHeaderEdit ? (
                  <EditableField 
                    value={ferrata.name} 
                    onSave={(v:string) => updateField('name', v)} 
                    textClass="text-4xl font-semibold tracking-tight text-blue-600" 
                  />
                ) : (
                  <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{ferrata.name}</h1>
                )}
              </div>
              
              <div className="pt-2">
                {isHeaderEdit ? (
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-2">
                      {isUploading ? "LÄDT HOCH..." : "➕ NEUES TOPO HOCHLADEN"}
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,application/pdf" 
                        onChange={handleTopoUpload} 
                        disabled={isUploading}
                      />
                    </label>
                    {ferrata.topo_url && (
                      <p className="text-[8px] text-emerald-500 font-bold uppercase">✓ Topo vorhanden</p>
                    )}
                  </div>
                ) : (
                  ferrata.topo_url && (
                    <button 
                      onClick={() => setShowTopoModal(true)} 
                      className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                      🗺️ Topo Karte öffnen
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Status & Difficulty Badges */}
            <div className="flex gap-4">
              <Badge 
                label="Difficulty" 
                value={ferrata.difficulty} 
                isEditable={isHeaderEdit} // Kopplung an Header-Stift
                onEdit={(v:string) => updateField('difficulty', v)} 
                color="bg-slate-50 border border-slate-100 text-slate-800" 
              />
              <FerrataStatusBadge 
                            ferrataId={id} 
                            initialStatus={ferrata?.status} 
                            onUpdate={fetchData} // Damit die Wartungshistorie sofort den neuen Log zeigt
                          />
            </div>
          </div>


        {/* VERWALTUNG & GEO DIREKT UNTER HEADER */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all relative">
            
            {/* DER STIFT-BUTTON (Oben Rechts) */}
            { (userRole === 'developer' || userRole === 'betreiber') && (
            <button 
              onClick={() => setIsGlobalEdit(!isGlobalEdit)}
              className={`absolute top-6 right-6 p-3 rounded-xl transition-all z-10 ${
                isGlobalEdit 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 rotate-12' 
                : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100'
              }`}
              title={isGlobalEdit ? "Speichern / Schließen" : "Daten bearbeiten"}
            >
              {isGlobalEdit ? '✓' : '✎'}
            </button>
            )}

            <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6 pr-12">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Verwaltung & Kontakt</h3>
                <p className="text-xs text-slate-300 italic">Offizielle Zuständigkeiten</p>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-none">Wartungsvertrag</p>
                <button 
                  onClick={() => isGlobalEdit && updateField('maintenance_contract', !ferrata.maintenance_contract)} 
                  disabled={!isGlobalEdit}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                    ferrata.maintenance_contract 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-slate-50 text-slate-400 border-slate-100'
                  } ${!isGlobalEdit && 'cursor-default opacity-80'}`}
                >
                  {ferrata.maintenance_contract ? "AKTIV ✓" : "INAKTIV ✕"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Betreiber Spalte */}
              <div className="space-y-8">
                <div className="border-l-2 border-blue-500 pl-4 py-1">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Betreiber & Steigwart</p>
                </div>
                
                <div className="grid gap-6">
                  <VerticalDataField 
                    label="Organisation / Eigentümer" 
                    value={ferrata.operator} 
                    isEditable={isGlobalEdit}
                    onSave={(v:string) => updateField('operator', v)} 
                  />
                  <VerticalDataField 
                    label="Offizielle Email" 
                    value={ferrata.operator_email} 
                    isEditable={isGlobalEdit}
                    onSave={(v:string) => updateField('operator_email', v)} 
                  />
                  <VerticalDataField 
                    label="Steigwart vor Ort" 
                    value={ferrata.warden_name} 
                    isEditable={isGlobalEdit}
                    onSave={(v:string) => updateField('warden_name', v)} 
                  />
                  <VerticalDataField 
                    label="Notfall / Telefon Steigwart" 
                    value={ferrata.warden_phone} 
                    isEditable={isGlobalEdit}
                    onSave={(v:string) => updateField('warden_phone', v)} 
                  />
                  <VerticalDataField 
                    label="Betreiber-Account" 
                    value={ferrata.profiles?.full_name || 'Nicht zugewiesen'} 
                  />

                  {userRole === 'developer' && isGlobalEdit && (
  <div className="col-span-full bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-4 animate-in fade-in slide-in-from-top-2">
    <label className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2 block ml-1">
      Betreiber zuweisen
    </label>
<select 
  value={ferrata?.owner_id ?? ''} 
  onChange={(e) => handleOwnerChange(e.target.value || null)}
  className="w-full bg-white border border-blue-200 rounded-lg p-2 text-xs font-bold text-blue-600 outline-none"
>
  <option value="">Kein Betreiber (System-Steig)</option>
  {owners.map((o) => (
  <option key={o.id} value={o.id}>
    {o.full_name || o.email} ({o.role === 'betreiber' ? 'Betreiber' : 'Beobachter'})
  </option>
))}
</select>
  </div>
)}
                  
                </div>
              </div>

              {/* Techniker Spalte */}
              <div className={`space-y-8 transition-opacity duration-500 ${ferrata.maintenance_contract ? 'opacity-100' : 'opacity-30'}`}>
                <div className="border-l-2 border-emerald-500 pl-4 py-1">
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wider">Externer Techniker</p>
                </div>

                <div className="grid gap-6">
                  <VerticalDataField 
                    label="Name des Technikers" 
                    value={ferrata.technician_name} 
                    isEditable={isGlobalEdit && ferrata.maintenance_contract}
                    onSave={(v:string) => updateField('technician_name', v)} 
                  />
                  <VerticalDataField 
                    label="Email Techniker" 
                    value={ferrata.technician_email} 
                    isEditable={isGlobalEdit && ferrata.maintenance_contract}
                    onSave={(v:string) => updateField('technician_email', v)} 
                  />
                  <VerticalDataField 
                    label="Telefon Techniker" 
                    value={ferrata.technician_phone} 
                    isEditable={isGlobalEdit && ferrata.maintenance_contract}
                    onSave={(v:string) => updateField('technician_phone', v)} 
                  />
                </div>
              </div>
            </div>
            
            {/* Kleiner Hinweis, wenn im Edit-Modus */}
            {isGlobalEdit && (
              <div className="mt-8 pt-4 border-t border-blue-50 text-center">
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                  Edit-Modus Aktiv — Änderungen werden beim Verlassen des Feldes gespeichert
                </p>
              </div>
            )}
          </section>

          <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all relative">
                
                {/* EDIT-STIFT FÜR GEO-DATEN */}
                { (userRole === 'developer' || userRole === 'betreiber') && (
                <button 
                  onClick={() => setIsGeoEdit(!isGeoEdit)}
                  className={`absolute top-6 right-6 p-3 rounded-xl transition-all z-10 ${
                    isGeoEdit 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 rotate-12' 
                    : 'bg-slate-50 text-slate-400 hover:text-slate-600 border border-slate-100'
                  }`}
                  title={isGeoEdit ? "Speichern" : "Geo-Daten bearbeiten"}
                >
                  {isGeoEdit ? '✓' : '✎'}
                </button>
                )}

                <div className="mb-10 border-b border-slate-50 pb-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Geo-Daten & Topografie</h3>
                  <p className="text-xs text-slate-300 italic">Koordinaten und Höhenangaben</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  
                  {/* Spalte 1: Einstieg */}
                  <div className="space-y-8">
                    <div className="border-l-2 border-blue-500 pl-4 py-1">
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Einstieg</p>
                    </div>
                    <div className="grid gap-6">
                      <VerticalDataField 
                        label="GPS-Einstieg" 
                        value={ferrata.coord_start} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('coord_start', v)} 
                      />
                      <VerticalDataField 
                        label="Höhe Einstieg (m)" 
                        value={ferrata.altitude_start} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('altitude_start', v)} 
                      />
                    </div>
                  </div>

                  {/* Spalte 2: Ausstieg */}
                  <div className="space-y-8">
                    <div className="border-l-2 border-indigo-500 pl-4 py-1">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">Ausstieg</p>
                    </div>
                    <div className="grid gap-6">
                      <VerticalDataField 
                        label="GPS-Ausstieg" 
                        value={ferrata.coord_end} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('coord_end', v)} 
                      />
                      <VerticalDataField 
                        label="Höhe Ausstieg (m)" 
                        value={ferrata.altitude_end} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('altitude_end', v)} 
                      />
                    </div>
                  </div>

                  {/* Spalte 3: Anlage */}
                  <div className="space-y-8">
                    <div className="border-l-2 border-slate-500 pl-4 py-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Details</p>
                    </div>
                    <div className="grid gap-6">
                      <VerticalDataField 
                        label="Höhenmeterdifferenz" 
                        value={ferrata.vertical_meters} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('vertical_meters', v)} 
                      />
                      <VerticalDataField 
                        label="Ausrichtung (Himmelsrichtung)" 
                        value={ferrata.exposition} 
                        isEditable={isGeoEdit}
                        onSave={(v:string) => updateField('exposition', v)} 
                      />
                    </div>
                  </div>

                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mt-8">
                  {/* Header & Button in einer Zeile, um oben Platz zu sparen */}
                  <div className="flex justify-between items-center mb-6 border-l-4 border-slate-400 pl-4 py-1">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Koordinaten Ausgangspunkt
                    </h3>
                    
                    {/* Navigation direkt als kompakter Link/Button im Header-Bereich */}
                    {ferrata.latitude && ferrata.longitude && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${ferrata.latitude},${ferrata.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider">Maps öffnen</span>
                        <span className="text-sm">📍</span>
                      </a>
                    )}
                  </div>

                  {/* Eingabefelder: Kompakter durch weniger gap und reduziertes Padding */}
                  <div className="grid grid-cols-2 gap-8 px-4">
                    <VerticalDataField 
                      label="Latitude" 
                      value={ferrata.latitude} 
                      isEditable={isGeoEdit} 
                      onSave={(v:string) => updateField('latitude', v)} 
                    />
                    <VerticalDataField 
                      label="Longitude" 
                      value={ferrata.longitude} 
                      isEditable={isGeoEdit} 
                      onSave={(v:string) => updateField('longitude', v)} 
                    />
                  </div>

                  {/* Falls keine Daten da sind, zeigen wir einen kleinen Hinweis dezent unten an */}
                  {(!ferrata.latitude || !ferrata.longitude) && (
                    <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                      <p className="text-[9px] font-bold uppercase text-slate-300 tracking-widest italic">
                        Keine Standortdaten verfügbar
                      </p>
                    </div>
                  )}
                </div>

                {isGeoEdit && (
                  <div className="mt-8 pt-4 border-t border-blue-50 text-center">
                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">
                      Edit-Modus Aktiv — Änderungen werden live gespeichert
                    </p>
                  </div>
                )}
              </section>
        </div>

        <div className="space-y-12 pt-4 gap-y-6">
          {/* TECHNIK BOX */}
          <section className="bg-white border border-slate-200 rounded-3xl p-8 relative shadow-sm">
            { (userRole === 'developer' || userRole === 'betreiber') && (
            <button 
              onClick={() => setIsTechEdit(!isTechEdit)}
              className={`absolute top-6 right-6 p-3 rounded-xl transition-all z-10 ${
                isTechEdit ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
            >
              {isTechEdit ? '✓' : '✎'}
            </button>
            )}

            <div className="mb-8 border-b border-slate-50 pb-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Technische Stammdaten</h3>
            </div>
            
            {/* Hauptgitter für Basis-Technik */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-10">
              <VerticalDataField label="Baujahr" value={ferrata.construction_year} isEditable={isTechEdit} onSave={(v:string) => updateField('construction_year', v)} />
              <VerticalDataField label="Erbauer / Firma" value={ferrata.builder} isEditable={isTechEdit} onSave={(v:string) => updateField('builder', v)} />
              <VerticalDataField label="Seil Ø (mm)" value={ferrata.rope_diameter} isEditable={isTechEdit} onSave={(v:string) => updateField('rope_diameter', v)} />
              <VerticalDataField label="Seillänge insg. (m)" value={ferrata.rope_length} isEditable={isTechEdit} onSave={(v:string) => updateField('rope_length', v)} />
              <VerticalDataField label="Ankerstärke (mm)" value={ferrata.anchor_strength} isEditable={isTechEdit} onSave={(v:string) => updateField('anchor_strength', v)} />
              <VerticalDataField label="Anzahl Anker (Stk)" value={ferrata.anchor_count} isEditable={isTechEdit} onSave={(v:string) => updateField('anchor_count', v)} />
            </div>

            {/* SONDERELEMENTE SEKTION */}
            <div className="mt-12 pt-8 border-t border-slate-50">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Spezialelemente (Brücken, Leitern, etc.)</h4>
                {isTechEdit && (
                  <button 
                    onClick={addSpecialElement}
                    className="text-[10px] font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                  >
                    + ELEMENT HINZUFÜGEN
                  </button>
                )}
              </div>

              <div className="grid gap-4">
                {(!ferrata.special_elements || ferrata.special_elements.length === 0) && (
                  <p className="text-xs text-slate-300 italic">Keine Sonderelemente registriert.</p>
                )}
                
                {ferrata.special_elements?.map((el: any, index: number) => (
                  <div key={index} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 group relative">
                    {isTechEdit && (
                      <button 
                        onClick={() => removeSpecialElement(index)}
                        className="absolute top-4 right-4 text-slate-300 hover:text-red-500 text-xs"
                      >
                        Entfernen ✕
                      </button>
                    )}
                    
                    <div className="grid md:grid-cols-4 gap-6 items-start">
                      {/* Typ Auswahl */}
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold uppercase text-slate-400">Element-Typ</p>
                        {isTechEdit ? (
                          <select 
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-bold"
                            value={el.type}
                            onChange={(e) => updateSpecialElement(index, 'type', e.target.value)}
                          >
                            <option value="4-Seilbrücke">4-Seilbrücke</option>
                            <option value="3-Seilbrücke">3-Seilbrücke</option>
                            <option value="2-Seilbrücke">2-Seilbrücke</option>
                            <option value="Leiter starr">Leiter starr</option>
                            <option value="Seilleiter">Seilleiter</option>
                            <option value="andere">andere...</option>
                          </select>
                        ) : (
                          <p className="text-sm font-bold uppercase text-slate-700">{el.type}</p>
                        )}
                      </div>

                      {/* Länge */}
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold uppercase text-slate-400">Länge (m)</p>
                        {isTechEdit ? (
                          <input 
                            type="text" className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs" 
                            value={el.length} onChange={(e) => updateSpecialElement(index, 'length', e.target.value)}
                          />
                        ) : (
                          <p className="text-sm font-medium">{el.length || '-'} m</p>
                        )}
                      </div>

                      {/* Beschreibung */}
                      <div className="md:col-span-2 space-y-1">
                        <p className="text-[8px] font-bold uppercase text-slate-400">Beschreibung</p>
                        {isTechEdit ? (
                          <textarea 
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs min-h-[40px]" 
                            value={el.description} onChange={(e) => updateSpecialElement(index, 'description', e.target.value)}
                          />
                        ) : (
                          <p className="text-xs text-slate-600 italic leading-relaxed">{el.description || 'Keine Beschreibung vorhanden.'}</p>
                        )}
                      </div>

                      {/* Bilder-Sektion für das Spezialelement */}
                      <div className="md:col-span-4 mt-6 pt-5 border-t border-slate-200/50">
                        <p className="text-[8px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Fotos des Elements</p>
                        
                        <div className="flex flex-wrap gap-3 pt-1">
                          {el.images?.map((img: string, i: number) => (
                            <div key={i} className="relative group/elem-thumb flex-shrink-0">
                              <button 
                                type="button"
                                onClick={() => setLightbox({ open: true, images: el.images, index: i })}
                                className="h-16 w-24 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-500 transition-all shadow-sm block bg-slate-50"
                              >
                                <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover/elem-thumb:scale-110" alt="Detail" />
                              </button>

                              {/* Lösch-Button: Jetzt mit korrekten Klammern */}
                              {isTechEdit && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeElementImage(index, i);
                                  }}
                                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center border-2 border-white shadow-lg hover:bg-red-600 transition-all z-10 opacity-0 group-hover/elem-thumb:opacity-100"
                                  title="Bild entfernen"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}

                          {/* Upload-Button */}
                          {isTechEdit && (
                            <label className="h-16 w-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 text-slate-300 hover:text-blue-500 transition-all gap-1">
                              <span className="text-xl leading-none">+</span>
                              <span className="text-[8px] font-bold uppercase tracking-tighter">Upload</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*" 
                                onChange={(e) => uploadElementImage(index, e)} 
                              />
                            </label>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. MEDIA & DOKUMENTE (Nebeneinander) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* BILDER GALERIE */}
            <section className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col relative overflow-hidden">
              
              {/* HEADER-BEREICH: Titel & Buttons sauber getrennt */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-6">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Impressionen & Media</h3>
                <p className="text-[10px] text-slate-300 mt-1 uppercase">{displayImages.length} Fotos hinterlegt</p>
              </div>
              
              <div className="flex items-center gap-3 self-end sm:self-auto">
                {/* Hinzufügen Button: Nur im Edit-Modus */}
                {isMediaEdit && (
                  <label htmlFor="gal-upload-multi" className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-2">
                    <span>HINZUFÜGEN</span>
                    <span className="text-sm">+</span>
                  </label>
                )}
                
                {/* Editierstift: Jetzt wieder im einheitlichen Blau-Schema */}
                { (userRole === 'developer' || userRole === 'betreiber') && (
                <button 
                  onClick={() => setIsMediaEdit(!isMediaEdit)}
                  className={`p-2.5 rounded-xl transition-all z-10 text-xs ${
                    isMediaEdit 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100 hover:text-blue-600'
                  }`}
                  title="Galerie bearbeiten"
                >
                  {isMediaEdit ? '✓' : '✎'}
                </button>
                )}
              </div>
              
              <input 
                id="gal-upload-multi" 
                type="file" 
                className="hidden" 
                onChange={handleMultipleUpload} 
                accept="image/*" 
                multiple 
              />
            </div>

              <div className="space-y-6 flex-1">
                {/* HAUPTBILD */}
                <div className="relative group overflow-hidden rounded-2xl border border-slate-100 shadow-inner bg-slate-50 min-aspect-video flex items-center justify-center">
                  {displayImages[activeImgIndex]?.url ? (
                    <>
                      <img 
                        src={displayImages[activeImgIndex].url} 
                        className="w-full aspect-video object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105" 
                        alt="Gallery Main"
                        onClick={() => setLightbox({ 
                          open: true, 
                          images: displayImages.map((img: any) => img.url), 
                          index: activeImgIndex 
                        })}
                      />
                      {/* Subtiles Overlay für Tiefe */}
                      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]"></div>
                    </>
                  ) : (
                    /* Platzhalter wenn kein Bild vorhanden oder URL leer ist */
                    <div className="w-full aspect-video flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                        <span className="text-slate-300">/</span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                        Keine Aufnahme verfügbar
                      </span>
                    </div>
                  )}
                </div>
                
                {/* THUMBNAILS: Fix für den Lösch-Button Überlapp-Fehler */}
                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide">
                  {displayImages.map((img: any, i: number) => (
                    <div key={i} className="relative flex-shrink-0 group/thumb" style={{ paddingTop: isMediaEdit ? '8px' : '0' }}>
                      <button 
                        onClick={() => setActiveImgIndex(i)} 
                        className={`h-20 w-28 rounded-xl overflow-hidden border-2 transition-all ${
                          activeImgIndex === i ? 'border-blue-500 scale-95 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* WICHTIG: Nur rendern, wenn url vorhanden und nicht leer ist */}
                        {img.url ? (
                          <img src={img.url} className="w-full h-full object-cover" alt="thumb" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                            <span className="text-[10px] text-slate-300 font-bold">...</span>
                          </div>
                        )}
                      </button>
                      
                      {/* Lösch-Button: Höherer Z-Index und bessere Positionierung */}
                      {isMediaEdit && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Verhindert, dass das Bild gleichzeitig ausgewählt wird
                            removeImage(i);
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 text-[10px] flex items-center justify-center border-2 border-white shadow-lg hover:bg-red-600 transition-colors z-30"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* DOKUMENTE */}
<section className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm flex flex-col relative overflow-hidden">
  
  {/* HEADER-BEREICH: Analog zur Galerie */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-6">
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Dokumente & Protokolle</h3>
      <p className="text-[10px] text-slate-300 mt-1 uppercase">{ferrata.docs?.length || 0} Dateien verfügbar</p>
    </div>
    
    <div className="flex items-center gap-3 self-end sm:self-auto">
      {/* Upload Button: Nur im Edit-Modus */}
      {isDocEdit && (
        <label htmlFor="doc-upload-multi" className="cursor-pointer bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all border border-blue-100 flex items-center gap-2 shadow-sm">
          <span>DATEI HOCHLADEN</span>
          <span className="text-sm">+</span>
        </label>
      )}
      
      {/* Editierstift: Konsistent mit Technik & Galerie */}
      { (userRole === 'developer' || userRole === 'betreiber') && (
      <button 
        type="button"
        onClick={() => setIsDocEdit(!isDocEdit)}
        className={`p-2.5 rounded-xl transition-all border ${
          isDocEdit 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 border-blue-600' 
            : 'bg-slate-50 text-slate-400 border-slate-100 hover:text-blue-600'
        }`}
      >
        {isDocEdit ? '✓' : '✎'}
      </button>
      )}
    </div>
    
    <input 
      id="doc-upload-multi" 
      type="file" 
      className="hidden" 
      onChange={handleDocumentUpload} 
      accept=".pdf,.doc,.docx,.xls,.xlsx"
      multiple 
    />
  </div>

  {/* DATEILISTE */}
  <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-2 scrollbar-thin">
    {(!ferrata.docs || ferrata.docs.length === 0) && (
      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <p className="text-xs text-slate-400 italic">Keine Dokumente hinterlegt.</p>
      </div>
    )}

    {ferrata.docs?.map((doc: any, i: number) => (
      <div key={i} className="group relative flex items-center justify-between p-4 bg-slate-50 hover:bg-white border border-slate-100 hover:border-blue-200 rounded-2xl transition-all shadow-sm">
        <div className="flex items-center gap-4 truncate">
          {/* Icon für den Dateityp (PDF simulieren) */}
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 text-blue-500 shadow-sm">
            <span className="text-[10px] font-black uppercase">PDF</span>
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-700 truncate">{doc.title || doc.name}</p>
            <p className="text-[9px] text-slate-400 uppercase tracking-tighter">Hinzugefügt am {new Date(doc.created_at).toLocaleDateString('de-DE')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Button: Immer da */}
          <a 
            href={doc.url} 
            target="_blank" 
            rel="noreferrer"
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <span className="text-sm">↓</span>
          </a>

          {/* Lösch-Button: Nur im Edit-Modus */}
          {isDocEdit && (
            <button 
              onClick={() => removeDocument(i)}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
            >
              <span className="text-sm">✕</span>
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
</section>

          </div>
        </div>

        {/* TOPO MODAL */}
        {showTopoModal && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setShowTopoModal(false)}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-full overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ferrata.name} — Topo</span>
                <button onClick={() => setShowTopoModal(false)} className="text-slate-400 hover:text-slate-900 text-xl p-2">✕</button>
              </div>
              <div className="overflow-y-auto p-4 bg-slate-50/50">
                <img src={ferrata.topo_url} className="w-full h-auto rounded-lg" alt="Full Topo" />
              </div>
            </div>
          </div>
        )}
      {/* QR-CODE & REPORT LINK SEKTION */}
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-12 shadow-sm overflow-hidden relative group">
          {/* Subtiler Hintergrund-Akzent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32 transition-colors group-hover:bg-blue-100/40"></div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
            
            {/* Linke Seite: Info & Link */}
            <div className="flex-1 space-y-6 text-center md:text-left">
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-2">Service-Schnittstelle</h3>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Meldungen für Wanderer</h2>
                <p className="text-slate-500 text-sm mt-4 leading-relaxed max-w-md">
                  Über diesen Link gelangen Nutzer direkt zum Meldeformular. Platzieren Sie den QR-Code am Einstieg des Klettersteigs, um aktuelle Zustandsberichte zu erhalten.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Link 
                  href={`/ferrata/${id}/report`}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-xs hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center gap-3 active:scale-95"
                >
                  <span>MELDESEITE ÖFFNEN</span>
                  <span className="text-lg">↗</span>
                </Link>
                
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                  ID: {id.substring(0,8)}...
                </p>
              </div>
            </div>

            {/* Rechte Seite: QR Code Box */}
            <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col items-center gap-6 shadow-inner">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                {/* Dynamischer QR Code via API (nutzt die aktuelle URL der Report-Seite) */}
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                    typeof window !== 'undefined' ? `${window.location.origin}/ferrata/${id}/report` : ''
                  )}`}
                  alt="QR Code zur Meldeseite"
                  className="w-40 h-40 object-contain"
                />
              </div>
              
              <div className="text-center space-y-2">
                <a 
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(
                    typeof window !== 'undefined' ? `${window.location.origin}/ferrata/${id}/report` : ''
                  )}`}
                  download={`QR_Meldung_${ferrata.name}.png`}
                  target="_blank"
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest border-b-2 border-blue-100 pb-1 transition-all"
                >
                  QR-Code herunterladen
                </a>
                <p className="text-[9px] text-slate-400 font-medium">Format: PNG (1000x1000px)</p>
              </div>
            </div>

          </div>
        </section>
        </div>

      {lightbox.open && (
        <ImageLightbox 
          images={lightbox.images} 
          currentIndex={lightbox.index} 
          onClose={() => setLightbox({ ...lightbox, open: false })}
          onNext={nextImg}
          onPrev={prevImg}
        />
      )}

    </main>
  );
}

// HILFS-KOMPONENTEN
function EditableField({ value, onSave, textClass }: any) {
  const [isEdit, setIsEdit] = useState(false);
  
  // Falls value aus der DB null oder undefined ist, 
  // erzwingen wir einen leeren String, um den React-Error zu vermeiden.
  const [val, setVal] = useState(value ?? '');

  // Synchronisiert den lokalen State, wenn sich die Props ändern 
  // (wichtig nach dem Speichern in Supabase)
  useEffect(() => {
    setVal(value ?? '');
  }, [value]);



  if (isEdit) {
    return (
      <input
        autoFocus
        className={`${textClass} bg-slate-50 border border-blue-200 rounded px-2 py-0.5 outline-none w-full shadow-sm text-slate-900`}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          onSave(val);
          setIsEdit(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === 'Escape') {
            setVal(value ?? ''); // Abbrechen
            setIsEdit(false);
          }
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setIsEdit(true)}
      className={`${textClass} cursor-text hover:text-blue-600 transition-colors py-0.5 px-2 -ml-2 rounded hover:bg-slate-50`}
    >
      {value || <span className="text-slate-300 italic">Bearbeiten...</span>}
    </div>
  );
}

function EditableDataField({ label, value, onSave }: any) {
  return (
    <div className="border-b border-slate-50 pb-2 flex justify-between items-end">
      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{label}</p>
      <EditableField value={value} onSave={onSave} textClass="text-[11px] font-medium text-slate-700 text-right" />
    </div>
  );
}

function Badge({ label, value, color, onEdit, isEditable }: any) {
  const [isEdit, setIsEdit] = useState(false);
  
  const diffOptions = ["A", "A/B", "B", "B/C", "C", "C/D", "D", "D/E", "E", "E/F", "F"];

  const getDisplayValue = (val: string) => {
    return val;
  };

  return (
    <div className="relative">
      <div 
        onClick={() => isEditable && setIsEdit(!isEdit)} 
        className={`px-5 py-3 rounded-2xl min-w-[160px] transition-all border shadow-sm flex flex-col items-center justify-center ${color} 
          ${isEditable ? 'cursor-pointer hover:border-blue-400 border-dashed' : 'border-transparent'}`}
      >
        <p className="text-[8px] font-bold uppercase opacity-50 mb-1 tracking-[0.2em] text-center w-full">{label}</p>
        <div className="flex items-center justify-center gap-2 w-full">
          <p className="text-sm font-bold tracking-tight leading-none uppercase text-center flex-1">
            {getDisplayValue(value)}
          </p>
          {isEditable && <span className="text-[10px] opacity-30">▾</span>}
        </div>
      </div>

{isEdit && isEditable && (
  <>
    <div className="fixed inset-0 z-40" onClick={() => setIsEdit(false)}></div>
    <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden py-1 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
      {/* Da statusOptions entfernt wurde, rendern wir nur noch diffOptions */}
      {diffOptions.map((opt) => (
        <button 
          key={opt} 
          className={`w-full py-3 px-4 text-[11px] font-bold uppercase hover:bg-blue-50 text-center block ${value === opt ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`}
          onClick={() => { 
            onEdit(opt); 
            setIsEdit(false); 
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  </>
)}

    </div>
  );
}

function ImageLightbox({ images, currentIndex, onClose, onNext, onPrev }: any) {
  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10">
      {/* Schließen Button */}
      <button onClick={onClose} className="absolute top-6 right-6 text-white text-3xl hover:scale-110 transition-transform">✕</button>
      
      {/* Navigation */}
      <button onClick={onPrev} className="absolute left-4 md:left-10 text-white text-4xl p-4 hover:bg-white/10 rounded-full transition-all">‹</button>
      <button onClick={onNext} className="absolute right-4 md:right-10 text-white text-4xl p-4 hover:bg-white/10 rounded-full transition-all">›</button>

      {/* Bild & Info */}
      <div className="max-w-5xl max-h-full flex flex-col items-center gap-4">
        <img 
          src={images[currentIndex]} 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl" 
          alt="Spezialelement Detail" 
        />
        <p className="text-white/50 text-xs font-mono uppercase tracking-widest">
          Foto {currentIndex + 1} von {images.length}
        </p>
      </div>
    </div>
  );
}