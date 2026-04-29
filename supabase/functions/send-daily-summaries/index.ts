import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Diese Variablen sind in der Supabase-Cloud AUTOMATISCH vorhanden
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') 
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') // Automatisch da!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Automatisch da!

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  // 1. Alle Meldungen holen, die noch nicht per Email versendet wurden
  const { data: reports, error } = await supabase
    .from('reports')
    .select(`
      id, type, description, location, 
      ferratas ( name, owner_id, profiles ( email, full_name ) )
    `)
    .eq('email_sent', false)

  if (!reports || reports.length === 0) {
    return new Response(JSON.stringify({ message: "Keine neuen Meldungen" }), { status: 200 })
  }

  // 2. Meldungen nach Betreiber-Email gruppieren
  const reportsByOwner = reports.reduce((acc, report) => {
    const email = report.ferratas?.profiles?.email || 'info@ferrata.report' // Fallback an dich
    if (!acc[email]) acc[email] = []
    acc[email].push(report)
    return acc
  }, {})

  // 3. Pro Betreiber eine Zusammenfassung senden
  for (const [email, items] of Object.entries(reportsByOwner)) {
    const reportListHtml = items.map(item => `
      <li>
        <strong>${item.ferratas?.name}</strong>: ${item.type} <br/>
        Ort: ${item.location} <br/>
        Info: ${item.description}
      </li>
    `).join('<hr/>')

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Safety Update <onboarding@resend.dev>',
        to: ['guentherausserhofer83@gmail.com'],
        subject: `Daily Update: ${items.length} neue Meldungen`,
        html: `<h2>Guten Morgen!</h2><p>Es liegen neue Meldungen für Ihre Klettersteige vor:</p><ul>${reportListHtml}</ul>`
      }),
    })
  }

  // 4. Meldungen als "versendet" markieren
  const reportIds = reports.map(r => r.id)
  await supabase.from('reports').update({ email_sent: true }).in('id', reportIds)

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})