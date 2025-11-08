import { load } from 'cheerio';

export async function GET() {
  const hvvUrl =
    'https://www.hvv.de/de/fahrplaene/abruf-fahrplaninfos/abfahrten-auf-ihrem-monitor/abfahrten-anzeige?show=e1fe617526ea41bd953f88d277d69427';

  const res = await fetch(hvvUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AstroFetcher/1.0)' },
  });
  const html = await res.text();

  const $ = load(html);
  const rows = $('table tbody tr');
  const data = [];

  rows.each((i, el) => {
    const tds = $(el).find('td');
    if (tds.length >= 4) {
      const halte = $(tds[0]).text().trim();
      const linie = $(tds[1]).text().trim();
      const richtung = $(tds[2]).text().trim();
      const abfahrt = $(tds[3]).text().trim();
      if (linie && abfahrt) data.push({ halte, linie, richtung, abfahrt });
    }
  });

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
