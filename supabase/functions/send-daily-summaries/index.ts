import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)
  console.log("--- START: Daily Summary Check (Dynamic Emails) ---");

  // 1. Meldungen abrufen inkl. Ferrata-Infos
  const { data: reports, error: reportError } = await supabase
    .from('reports')
    .select(`
      id, type, description, location,
      ferratas!inner ( name, owner_id )
    `)
    .eq('email_sent', false);

  if (reportError || !reports) {
    console.error("Fehler beim Laden der Berichte:", reportError?.message);
    return new Response(JSON.stringify({ error: reportError?.message }), { status: 500 });
  }

  if (reports.length === 0) {
    return new Response(JSON.stringify({ message: "Keine neuen Daten" }), { status: 200 });
  }

  // 2. Alle Profile laden, um die E-Mail-Adressen der Owner zu haben
  const { data: profiles } = await supabase.from('profiles').select('id, email');
  const profileMap = Object.fromEntries(profiles?.map(p => [p.id, p.email]) || []);

  // 3. Meldungen nach Ziel-Email gruppieren
  const reportsByEmail: Record<string, any[]> = {};

  reports.forEach(report => {
    const ownerId = report.ferratas?.owner_id;
    let targetEmail = profileMap[ownerId] || 'guentherausserhofer83@gmail.com'; 
    // Sobald du live gehst, änderst du oben die Adresse einfach auf 'info@ferrata.report'

    if (!reportsByEmail[targetEmail]) {
      reportsByEmail[targetEmail] = [];
    }
    reportsByEmail[targetEmail].push(report);
  });

  // 4. E-Mails pro Gruppe versenden
  for (const [email, items] of Object.entries(reportsByEmail)) {
    console.log(`Versende Summary (${items.length} Berichte) an: ${email}`);

    const reportListHtml = items.map(item => `
      <li style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; list-style: none;">
        <b style="color: #2563eb;">${item.ferratas?.name}</b><br/>
        <span style="font-size: 12px; color: #64748b;">${item.type} | ${item.location}</span><br/>
        <p style="margin: 5px 0 0 0;">${item.description}</p>
      </li>
    `).join('');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'ferrata.report <onboarding@resend.dev>',
        to: [email],
        subject: `Daily Update: ${items.length} neue Meldungen`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
            <h2 style="color: #0f172a;">Guten Morgen!</h2>
            <p>Es liegen neue Mängelmeldungen für Ihre Klettersteige vor:</p>
            <ul style="padding: 0;">${reportListHtml}</ul>
            <br/>
            <p style="font-size: 11px; color: #94a3b8;">Automatischer Report von ferrata.report</p>
          </div>
        `
      }),
    });

    const emailResult = await emailRes.json();

    // 5. Nur wenn der Versand an diese Email klappte, in DB als versendet markieren
    if (emailRes.ok && emailResult.id) {
      const ids = items.map(r => r.id);
      await supabase.from('reports').update({ email_sent: true }).in('id', ids);
    }
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});