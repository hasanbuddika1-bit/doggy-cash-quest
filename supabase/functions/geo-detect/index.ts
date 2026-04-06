const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    let countryCode = 'UNKNOWN';
    let countryName = 'Unknown';

    // Try multiple geo APIs for reliability
    try {
      const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data.country_code && !data.error) {
          countryCode = data.country_code;
          countryName = data.country_name || 'Unknown';
        }
      }
    } catch {
      // Fallback to ip-api.com
      try {
        const res2 = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode,country`, { signal: AbortSignal.timeout(5000) });
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2.countryCode) {
            countryCode = data2.countryCode;
            countryName = data2.country || 'Unknown';
          }
        }
      } catch { /* ignore */ }
    }

    return new Response(JSON.stringify({
      country: countryCode,
      country_name: countryName,
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
