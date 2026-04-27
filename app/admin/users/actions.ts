"use server";

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function inviteUserAction(formData: { 
  email: string; 
  fullName: string; 
  role: string;
  company?: string;
  phone?: string;
}) {
  // 1. Admin-Client mit Service Role Key erstellen
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // 2. Basis-URL für den Redirect bestimmen
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    // 3. User in Supabase Auth einladen
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(formData.email, {
      data: { 
        full_name: formData.fullName,
        role: formData.role,
        company: formData.company || null,
        phone: formData.phone || null
      },
      // Der User wird nach Klick auf den Link direkt zur Passwort-Vergabe geschickt
      redirectTo: `${baseUrl}/auth/set-password`
    });

    if (error) throw error;

    // 4. Cache der Admin-Seite aktualisieren, damit der neue User sofort erscheint
    revalidatePath('/admin/users');
    
    return { success: true };
  } catch (error: any) {
    console.error('Invite Error:', error.message);
    return { success: false, error: error.message };
  }
}