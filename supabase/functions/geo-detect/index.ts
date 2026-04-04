import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Get client IP from headers
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Use a free IP geolocation API
    const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`);
    const geoData = await geoResponse.json();

    return new Response(JSON.stringify({
      country: geoData.countryCode || 'UNKNOWN',
      country_name: geoData.country || 'Unknown',
      ip,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ country: 'UNKNOWN', error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
