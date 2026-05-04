// TON live price feed (USDT -> TON) via CoinGecko, with simple in-memory cache
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let cache: { price: number; ts: number } | null = null;
const TTL_MS = 60_000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (cache && Date.now() - cache.ts < TTL_MS) {
      return new Response(JSON.stringify({ ton_usdt: cache.price, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // CoinGecko: how many USD 1 TON costs
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    const j = await r.json();
    const tonUsd = Number(j?.['the-open-network']?.usd);
    if (!tonUsd || isNaN(tonUsd)) throw new Error('Invalid price');

    cache = { price: tonUsd, ts: Date.now() };
    return new Response(JSON.stringify({ ton_usdt: tonUsd, cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    // fallback: try Binance public ticker
    try {
      const r = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT');
      const j = await r.json();
      const p = Number(j?.price);
      if (p) {
        cache = { price: p, ts: Date.now() };
        return new Response(JSON.stringify({ ton_usdt: p, source: 'binance' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch {}
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
