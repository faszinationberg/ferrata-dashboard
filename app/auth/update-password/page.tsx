"use client";
import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const supabase = createClient();

  const handleUpdate = async () => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) alert(error.message);
    else alert("Passwort erfolgreich gesetzt! Du kannst die App jetzt nutzen.");
  };

  return (
    <div className="p-20 max-w-md mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold">Lege dein Passwort fest</h1>
      <input 
        type="password" 
        placeholder="Dein Passwort" 
        className="border p-2 rounded"
        onChange={(e) => setPassword(e.target.value)} 
      />
      <button onClick={handleUpdate} className="bg-blue-600 text-white p-2 rounded">
        Passwort speichern
      </button>
    </div>
  );
}