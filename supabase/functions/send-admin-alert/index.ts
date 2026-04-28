import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // CORS Handling für Browser-Anfragen
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const { adminEmail, ferrataName, reportDetails } = await req.json()

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Meldung <onboarding@resend.dev>', // Später durch deine Domain ersetzen
        to: [adminEmail],
        subject: `⚠️ Mangel ohne Betreiber: ${ferrataName}`,
        html: `
          <h2>Mangelmeldung: ${ferrataName}</h2>
          <p>Diesem Klettersteig ist kein Techniker zugeordnet.</p>
          <hr/>
          <p><strong>Was:</strong> ${reportDetails.type}</p>
          <p><strong>Wo:</strong> ${reportDetails.location}</p>
          <p><strong>Details:</strong> ${reportDetails.description}</p>
          <br/>
          <p><strong>Melder:</strong> ${reportDetails.reporter_name} (${reportDetails.reporter_email})</p>
        `,
      }),
    })

    return new Response(JSON.stringify({ status: 'sent' }), { 
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } 
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
})