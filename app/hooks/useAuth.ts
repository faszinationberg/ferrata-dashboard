import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

export function useAuth() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null); // State hinzugefügt
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function getAuthData() {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setUserEmail(null);
          setUserRole(null);
          setUserProfile(null);
          return;
        }

        setUserEmail(user.email ?? null);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*') // Lädt das gesamte Profil
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUserRole(profile.role);
          setUserProfile(profile); // Profil im State speichern
        }
      } catch (err) {
        console.error('Auth-Fehler:', err);
      } finally {
        setLoading(false);
      }
    }

    getAuthData();
  }, []);

  // WICHTIG: userProfile hier im return hinzufügen
  return { userEmail, userRole, userProfile, loading };
}