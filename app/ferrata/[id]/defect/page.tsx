"use client";

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';

export default function AddDefect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    type: 'Seil/Anker',
    priority: 'yellow',
    description: '',
    location: '',
    coordinates: ''
  });

  // GPS Funktion (Koordinaten aus System lesen)
  const getGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData({
          ...formData, 
          coordinates: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`
        });
      });
    } else {
      alert("GPS wird von diesem Browser nicht unterstützt.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    let uploadedImageUrl = null;

    try {
      if (imageFile) {
        const filePath = `reports/${id}/${Date.now()}_${imageFile.name}`;
        const { error: sError } = await supabase.storage.from('reports').upload(filePath, imageFile);
        if (sError) throw sError;
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(filePath);
        uploadedImageUrl = urlData.publicUrl;
      }

      const { error: dbError } = await supabase.from('reports').insert([{
        ferrata_id: id,
        type: formData.type,
        priority: formData.priority,
        description: formData.description,
        location: formData.location,
        coordinates: formData.coordinates,
        image_url: uploadedImageUrl,
        verified: true,
        resolved: false
      }]);

      if (dbError) throw dbError;
      router.push(`/ferrata/${id}`);
    } catch (err: any) {
      alert("Fehler beim Speichern: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto space-y-8">
        <button onClick={() => router.back()} className="font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900">← Abbrechen</button>
        
        <section className="bg-white p-10 rounded-[3.5rem] shadow-2xl border border-white">
          <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-10">Mangel <span className="text-blue-600 underline decoration-4">melden</span></h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* PRIORITÄT MIT FARBEN & SYMBOLEN */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 block">Dringlichkeit</label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'yellow', label: 'Info', icon: '🔔', color: 'bg-yellow-400' },
                  { id: 'orange', label: 'Wartung', icon: '🛠️', color: 'bg-orange-500' },
                  { id: 'red', label: 'GEFAHR', icon: '⚠️', color: 'bg-red-600' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({...formData, priority: p.id})}
                    className={`p-6 rounded-3xl flex flex-col items-center gap-2 transition-all ${
                      formData.priority === p.id ? `${p.color} text-white shadow-xl scale-105` : 'bg-slate-50 text-slate-400'
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="font-black text-[10px] uppercase">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* KOORDINATEN AUS SYSTEM LESEN */}
            <div className="relative">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Koordinaten (Optional)</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="00.0000, 00.0000"
                  className="flex-1 bg-slate-50 p-4 rounded-2xl font-mono text-sm outline-none border border-transparent focus:bg-white focus:border-slate-100"
                  value={formData.coordinates}
                  onChange={(e) => setFormData({...formData, coordinates: e.target.value})}
                />
                <button 
                  type="button"
                  onClick={getGPS}
                  className="bg-blue-600 text-white px-4 rounded-2xl font-black text-xs hover:bg-blue-700 active:scale-90 transition-all"
                >
                  📍 GPS
                </button>
              </div>
            </div>

            {/* KATEGORIE MIT ICONS */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Kategorie</label>
              <select 
                className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none outline-none appearance-none"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="Seil/Anker">🔗 Seil / Anker</option>
                <option value="Trittbügel/Leiter">🪜 Trittbügel / Leiter</option>
                <option value="Fels/Gelände">🪨 Fels / Gelände</option>
                <option value="Beschilderung">🪧 Beschilderung</option>
              </select>
            </div>

            {/* FOTO-UPLOAD */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Schadensbild</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-xs font-black file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:bg-slate-900 file:text-white cursor-pointer"
              />
            </div>

            {/* BESCHREIBUNG */}
            <textarea 
              required
              placeholder="Genaue Beschreibung des Schadens..."
              className="w-full bg-slate-50 p-6 rounded-[2rem] font-bold outline-none min-h-[120px] focus:bg-white"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white p-6 rounded-[2.5rem] font-black uppercase italic tracking-widest hover:bg-blue-600 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Synchronisiere...' : 'Mangel einreichen'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}