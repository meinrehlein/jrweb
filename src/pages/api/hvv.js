import crypto from "crypto";

const USER = "JannisReinelt";
const PASS = import.meta.env.HOCHBAHN_PASS; // ← in Netlify als Secret setzen

async function callDepartureMonitor(stationId) {
  const timestamp = Math.floor(Date.now() / 1000); // Sekunden
  const signature = crypto
    .createHash("sha1")
    .update(USER + timestamp + PASS)
    .digest("hex");

  const headers = {
    "GV-Authentication": USER,
    "GV-Request-Timestamp": timestamp.toString(),
    "GV-Request-Signature": signature,
    "Content-Type": "application/json"
  };

  const body = JSON.stringify({
    station: { id: stationId },
    timeOffset: 0,
    maxList: 20
  });

  const res = await fetch("https://gti.geofox.de/gti/public/departureMonitor", {
    method: "POST",
    headers,
    body
  });

  if (!res.ok) {
    throw new Error("Geofox error: " + res.status);
  }

  return res.json();
}

export async function GET() {
  const stations = [
    { name: "Grevenweg", id: "Master:10090" },
    { name: "Burgstraße", id: "Master:10908" }
  ];

  const result = [];

  for (const s of stations) {
    try {
      const json = await callDepartureMonitor(s.id);

      (json.departures || []).forEach((dep) => {
        result.push({
          halte: s.name,
          linie: dep.line.name,
          richtung: dep.line.direction,
          abfahrt: dep.time,
          delay: dep.delay || 0
        });
      });
    } catch (err) {
      console.error("Error for " + s.name, err);
    }
  }

  // sort by time
  result.sort((a, b) => new Date(a.abfahrt) - new Date(b.abfahrt));

  return new Response(JSON.stringify({ data: result }), {
    headers: { "Content-Type": "application/json" }
  });
}
