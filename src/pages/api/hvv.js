import { load } from 'cheerio'; // keep if you ever need HTML parsing (not used here)

export async function GET() {
  const urls = [
    // Grevenweg
    'https://www.hvv.de/linking-service/abfahrten/show/e1fe617526ea41bd953f88d277d69427?numberOfResult=20&blackList=',
    // Burgstraße – insert your real “show=” ID here once you find it
    // 'https://www.hvv.de/linking-service/abfahrten/show/<BURGSTRASSE_ID>?numberOfResult=20&blackList='
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Referer': 'https://www.hvv.de/',
    'X-Requested-With': 'XMLHttpRequest',
  };

  let all = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error('HVV responded', res.status, 'for', url);
        continue;
      }

      const json = await res.json();

      if (json && Array.isArray(json.monitors)) {
        json.monitors.forEach((m) => {
          (m.lines || []).forEach((line) => {
            (line.departures || []).forEach((dep) => {
              all.push({
                halte: m.name,
                linie: line.name,
                richtung: line.towards,
                abfahrt: dep.time, // ISO time string
                delay: dep.delayInMinutes || 0,
              });
            });
          });
        });
      } else {
        console.warn('HVV: no monitors for', url);
      }
    } catch (err) {
      console.error('Fetch error', err);
    }
  }

  // sort by time, newest first
  all.sort((a, b) => new Date(a.abfahrt) - new Date(b.abfahrt));

  return new Response(JSON.stringify({ data: all }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

