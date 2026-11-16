// Build-time weather download. Run with: npm run fetch-weather
//
// Downloads hourly 2 m air temperature for one complete heating season
// (local Oct 1 00:00 to Apr 30 23:00) for each city from the Open-Meteo
// Historical Weather API (free, no key) and saves compact static JSON in
// /public/data. The app never calls a weather API at runtime.
//
// Weather data by Open-Meteo.com (https://open-meteo.com/), licensed CC BY 4.0.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SEASON_START_YEAR = 2025; // season = Oct 1, 2025 to Apr 30, 2026

const CITIES = [
  { id: "waterloo", name: "Waterloo", province: "ON", lat: 43.4643, lon: -80.5204, tz: "America/Toronto" },
  { id: "toronto", name: "Toronto", province: "ON", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { id: "montreal", name: "Montreal", province: "QC", lat: 45.5019, lon: -73.5674, tz: "America/Toronto" },
  { id: "calgary", name: "Calgary", province: "AB", lat: 51.0447, lon: -114.0719, tz: "America/Edmonton" },
  { id: "vancouver", name: "Vancouver", province: "BC", lat: 49.2827, lon: -123.1207, tz: "America/Vancouver" },
];

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "data");

/** Local wall-clock parts for a UTC instant in an IANA time zone. */
function localParts(utcMs, tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const p = Object.fromEntries(fmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute };
}

/** Offset (minutes) such that local wall clock = UTC + offset. */
function utcOffsetMin(utcMs, tz) {
  const p = localParts(utcMs, tz);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  return Math.round((asUtc - utcMs) / 60000);
}

async function fetchCity(city) {
  const y0 = SEASON_START_YEAR;
  const y1 = SEASON_START_YEAR + 1;
  // Fetch in UTC with a day of margin on each side, then trim to the local season.
  const url =
    "https://archive-api.open-meteo.com/v1/archive" +
    `?latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${y0}-09-30&end_date=${y1}-05-02` +
    "&hourly=temperature_2m&timezone=GMT&temperature_unit=celsius";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${city.id}: HTTP ${res.status} from Open-Meteo`);
  const json = await res.json();
  const times = json.hourly.time; // "YYYY-MM-DDTHH:MM" in UTC
  const temps = json.hourly.temperature_2m;

  const hourlyC = [];
  const offsets = []; // run-length encoded UTC offsets: { fromIndex, offsetMin }
  let startUtc = null;
  for (let i = 0; i < times.length; i++) {
    const utcMs = Date.parse(times[i] + ":00Z");
    const lp = localParts(utcMs, city.tz);
    const inSeason =
      (lp.y === y0 && lp.m >= 10) || (lp.y === y1 && lp.m <= 4);
    if (!inSeason) continue;
    if (temps[i] === null || temps[i] === undefined || Number.isNaN(temps[i])) {
      throw new Error(`${city.id}: missing temperature at ${times[i]}Z`);
    }
    if (startUtc === null) startUtc = utcMs;
    const off = utcOffsetMin(utcMs, city.tz);
    if (offsets.length === 0 || offsets[offsets.length - 1].offsetMin !== off) {
      offsets.push({ fromIndex: hourlyC.length, offsetMin: off });
    }
    hourlyC.push(Math.round(temps[i] * 10) / 10);
  }

  const expected = 212 * 24; // Oct(31)+Nov(30)+Dec(31)+Jan(31)+Feb(28)+Mar(31)+Apr(30) days
  if (hourlyC.length !== expected) {
    throw new Error(`${city.id}: expected ${expected} hours, got ${hourlyC.length}`);
  }

  return {
    schema: 1,
    cityId: city.id,
    name: city.name,
    province: city.province,
    requested: { latitude: city.lat, longitude: city.lon },
    grid: { latitude: json.latitude, longitude: json.longitude, elevationM: json.elevation },
    timeZone: city.tz,
    seasonLabel: `Oct 1, ${y0} to Apr 30, ${y1}`,
    startUtc: new Date(startUtc).toISOString(),
    stepSeconds: 3600,
    utcOffsets: offsets,
    variable: "temperature_2m",
    unit: "degC",
    hourlyC,
    source: {
      name: "Open-Meteo Historical Weather API",
      url: "https://open-meteo.com/en/docs/historical-weather-api",
      requestUrl: url,
      licence: "CC BY 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution: "Weather data by Open-Meteo.com",
      retrieved: new Date().toISOString().slice(0, 10),
    },
  };
}

await mkdir(outDir, { recursive: true });
for (const city of CITIES) {
  const data = await fetchCity(city);
  const file = join(outDir, `weather-${city.id}.json`);
  await writeFile(file, JSON.stringify(data));
  const min = Math.min(...data.hourlyC);
  const max = Math.max(...data.hourlyC);
  const mean = data.hourlyC.reduce((a, b) => a + b, 0) / data.hourlyC.length;
  console.log(
    `${city.id}: ${data.hourlyC.length} h, min ${min} C, mean ${mean.toFixed(2)} C, max ${max} C, ` +
      `grid ${data.grid.latitude},${data.grid.longitude}, offsets ${JSON.stringify(data.utcOffsets)}`
  );
}
