const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Get client IP from various headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const cfIp = req.headers.get('cf-connecting-ip');
    
    const ip = cfIp || (forwardedFor?.split(',')[0]?.trim()) || realIp || '';

    let countryCode = 'UNKNOWN';
    let countryName = 'Unknown';

    // Try multiple APIs
    const apis = [
      async () => {
        const res = await fetch(`https://ipapi.co/${ip}/json/`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.country_code && !data.error) return { code: data.country_code, name: data.country_name || 'Unknown' };
        }
        return null;
      },
      async () => {
        // This API auto-detects caller IP when no IP specified
        const res = await fetch(`http://ip-api.com/json/${ip || ''}?fields=countryCode,country,status`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.countryCode) return { code: data.countryCode, name: data.country || 'Unknown' };
        }
        return null;
      },
      async () => {
        const res = await fetch(`https://ipwho.is/${ip || ''}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.country_code) return { code: data.country_code, name: data.country || 'Unknown' };
        }
        return null;
      },
    ];

    for (const api of apis) {
      try {
        const result = await api();
        if (result) {
          countryCode = result.code;
          countryName = result.name;
          break;
        }
      } catch { /* try next */ }
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
