/* Dada AQI Checker – by Pratham Dada
 * APIs (free, no key): Open-Meteo Geocoding, Air Quality and Forecast.
 * Reverse geocoding for "Locate me": BigDataCloud client API (free, no key).
 */
'use strict';

// ---------- AQI levels (US AQI breakpoints, six-level labels) ----------
const LEVELS = [
  { max: 50,       key: 'good',      label: 'Good',      emoji: '😊', advice: 'Air quality is satisfactory. It is a great day to be outdoors.' },
  { max: 100,      key: 'moderate',  label: 'Moderate',  emoji: '🙂', advice: 'Acceptable for most people. Unusually sensitive individuals may want to limit long outdoor exertion.' },
  { max: 150,      key: 'poor',      label: 'Poor',      emoji: '😷', advice: 'Children, older adults and people with asthma or heart conditions should reduce prolonged outdoor activity.' },
  { max: 200,      key: 'unhealthy', label: 'Unhealthy', emoji: '🤧', advice: 'Everyone may feel effects. Limit outdoor exercise and consider wearing an N95 mask outside.' },
  { max: 300,      key: 'severe',    label: 'Severe',    emoji: '🚨', advice: 'Avoid outdoor exertion. Keep windows closed and use an air purifier if you have one.' },
  { max: Infinity, key: 'hazardous', label: 'Hazardous', emoji: '☠️', advice: 'Health emergency conditions. Stay indoors, seal gaps and avoid any outdoor activity.' }
];
const SCALE_BOUNDS = [0, 50, 100, 150, 200, 300, 500];

const POLLUTANTS = [
  { id: 'pm2_5',            name: 'PM2.5', unit: 'µg/m³', ref: 250,   hint: 'Fine particles' },
  { id: 'pm10',             name: 'PM10',  unit: 'µg/m³', ref: 430,   hint: 'Coarse dust' },
  { id: 'carbon_monoxide',  name: 'CO',    unit: 'µg/m³', ref: 15000, hint: 'Carbon monoxide' },
  { id: 'sulphur_dioxide',  name: 'SO₂',   unit: 'µg/m³', ref: 800,   hint: 'Sulphur dioxide' },
  { id: 'nitrogen_dioxide', name: 'NO₂',   unit: 'µg/m³', ref: 400,   hint: 'Nitrogen dioxide' },
  { id: 'ozone',            name: 'O₃',    unit: 'µg/m³', ref: 400,   hint: 'Ozone' }
];

const WEATHER_CODES = {
  0: ['Clear sky', '☀️', '🌙'], 1: ['Mostly clear', '🌤️', '🌙'], 2: ['Partly cloudy', '⛅', '☁️'], 3: ['Overcast', '☁️', '☁️'],
  45: ['Fog', '🌫️', '🌫️'], 48: ['Rime fog', '🌫️', '🌫️'],
  51: ['Light drizzle', '🌦️', '🌧️'], 53: ['Drizzle', '🌦️', '🌧️'], 55: ['Heavy drizzle', '🌧️', '🌧️'],
  61: ['Light rain', '🌦️', '🌧️'], 63: ['Rain', '🌧️', '🌧️'], 65: ['Heavy rain', '🌧️', '🌧️'],
  71: ['Light snow', '🌨️', '🌨️'], 73: ['Snow', '❄️', '❄️'], 75: ['Heavy snow', '❄️', '❄️'],
  80: ['Rain showers', '🌦️', '🌧️'], 81: ['Rain showers', '🌧️', '🌧️'], 82: ['Violent showers', '⛈️', '⛈️'],
  95: ['Thunderstorm', '⛈️', '⛈️'], 96: ['Thunderstorm, hail', '⛈️', '⛈️'], 99: ['Thunderstorm, hail', '⛈️', '⛈️']
};

const $ = (id) => document.getElementById(id);
const app = $('app');

// ---------- Helpers ----------
const getLevel = (aqi) => LEVELS.find((l) => aqi <= l.max);

function markerPercent(aqi) {
  const v = Math.max(0, Math.min(aqi, 500));
  for (let i = 0; i < SCALE_BOUNDS.length - 1; i++) {
    const lo = SCALE_BOUNDS[i], hi = SCALE_BOUNDS[i + 1];
    if (v <= hi) return ((i + (v - lo) / (hi - lo)) / 6) * 100;
  }
  return 100;
}

function uvLabel(uv) {
  if (uv < 3) return 'Low';
  if (uv < 6) return 'Moderate';
  if (uv < 8) return 'High';
  if (uv < 11) return 'Very high';
  return 'Extreme';
}

function describeWeather(code, isDay, aqi) {
  const [text, dayIcon, nightIcon] = WEATHER_CODES[code] || ['Unknown', '🌡️', '🌡️'];
  const clearish = code <= 3;
  if (clearish && aqi > 150) return { text: 'Hazy', icon: '🌫️' };
  if (clearish && aqi > 100 && code <= 1) return { text: 'Hazy sunshine', icon: isDay ? '🌤️' : '🌙' };
  return { text: isDay || code > 3 ? (code === 0 && isDay ? 'Sunny' : text) : text, icon: isDay ? dayIcon : nightIcon };
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

function showBanner(msg, type = 'error') {
  const b = $('banner');
  b.textContent = msg;
  b.classList.remove('hidden');
  b.style.borderColor = type === 'error' ? 'rgba(254,202,202,0.9)' : 'rgba(255,255,255,0.4)';
}
const hideBanner = () => $('banner').classList.add('hidden');

function setLoading(on) {
  app.classList.toggle('loading', on);
  document.querySelectorAll('#searchForm button').forEach((b) => (b.disabled = on));
}

// ---------- Data ----------
async function geocode(query) {
  const parts = query.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) throw new Error('Please type a city name.');
  const qualifier = parts.slice(1).join(' ').toLowerCase();
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(parts[0])}&count=10&language=en&format=json`
  );
  if (!data.results || !data.results.length) throw new Error(`Couldn't find "${query}". Check the spelling or try a nearby city.`);
  const match = qualifier
    ? data.results.find((r) => `${r.admin1 || ''} ${r.country || ''}`.toLowerCase().includes(qualifier))
    : null;
  const r = match || data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: [r.name, r.admin1].filter(Boolean).join(', ') + (r.country ? ` (${r.country})` : '') };
}

async function reverseGeocode(lat, lon) {
  try {
    const d = await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
    const city = d.city || d.locality || d.principalSubdivision;
    if (city) return [city, d.principalSubdivision !== city ? d.principalSubdivision : null].filter(Boolean).join(', ');
  } catch (_) { /* fall through */ }
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

async function fetchConditions(lat, lon) {
  const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index&timezone=auto`;
  const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day&timezone=auto`;
  const [aq, wx] = await Promise.all([getJSON(aqUrl), getJSON(wxUrl)]);
  if (!aq.current || aq.current.us_aqi == null) throw new Error('Air quality data is not available for this location yet.');
  return { aq: aq.current, wx: wx.current };
}

// ---------- Render ----------
function render(placeName, { aq, wx }) {
  const aqi = Math.round(aq.us_aqi);
  const level = getLevel(aqi);

  $('bg').className = `bg-${level.key}`;
  // restart the fade animation
  $('bg').style.animation = 'none'; void $('bg').offsetWidth; $('bg').style.animation = '';

  $('place').textContent = placeName;
  $('updated').textContent = 'Updated ' + new Date(aq.time).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' (local time)';
  $('aqiNumber').textContent = aqi;
  $('statusPill').textContent = `${level.emoji} ${level.label}`;
  $('advice').textContent = level.advice;
  $('marker').style.left = markerPercent(aqi) + '%';

  // main pollutant = highest ratio to its reference
  const dominant = POLLUTANTS.map((p) => ({ p, r: (aq[p.id] ?? 0) / p.ref })).sort((a, b) => b.r - a.r)[0].p;
  $('mainPollutant').textContent = `Main: ${dominant.name}`;

  $('pollutants').innerHTML = POLLUTANTS.map((p) => {
    const v = aq[p.id];
    const pct = v == null ? 0 : Math.min(100, (v / p.ref) * 100);
    return `<div class="pollutant">
      <div class="flex items-baseline justify-between"><span class="font-semibold">${p.name}</span><span class="text-[11px] text-white/70">${p.unit}</span></div>
      <div class="num text-2xl font-bold mt-1">${v == null ? '–' : Math.round(v * 10) / 10}</div>
      <div class="text-xs text-white/75">${p.hint}</div>
      <div class="meter"><i style="width:${pct}%"></i></div>
    </div>`;
  }).join('');

  const isDay = !!wx.is_day;
  const w = describeWeather(wx.weather_code, isDay, aqi);
  $('wxIcon').textContent = w.icon;
  $('cond').textContent = w.text;
  $('temp').textContent = `${Math.round(wx.temperature_2m)}°C`;
  $('feels').textContent = `${Math.round(wx.apparent_temperature)}°C`;
  $('humidity').textContent = `${Math.round(wx.relative_humidity_2m)}%`;
  $('wind').textContent = `${Math.round(wx.wind_speed_10m)} km/h`;
  const uv = aq.uv_index ?? 0;
  $('uv').textContent = Math.round(uv * 10) / 10;
  $('uvLabel').textContent = uvLabel(uv);

  $('illustration').innerHTML = buildIllustration(aqi, level, isDay, wx.weather_code);
  document.title = `${aqi} ${level.label} · ${placeName} – Dada AQI Checker`;
}

// ---------- Illustration: sunset skyline that hazes over as AQI rises ----------
function buildIllustration(aqi, level, isDay, code) {
  const haze = Math.min(0.78, aqi / 320);
  const sunColor = { good: '#fde68a', moderate: '#fcd34d', poor: '#fb923c', unhealthy: '#f87171', severe: '#c084fc', hazardous: '#be123c' }[level.key];
  const skyTop = isDay ? { good: '#38bdf8', moderate: '#fbbf24', poor: '#fb923c', unhealthy: '#f87171', severe: '#a78bfa', hazardous: '#9f1239' }[level.key] : '#1e1b4b';
  const skyBottom = isDay ? '#fff7ed' : '#4c1d95';
  const buildings = [[20,70,46],[70,110,34],[108,88,52],[164,126,38],[206,96,56],[266,134,40],[310,84,50],[358,108,30]];
  const rainy = [51,53,55,61,63,65,80,81,82,95,96,99].includes(code);

  const stars = !isDay ? [[50,40],[120,70],[200,30],[260,60],[330,35],[370,80]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity=".85"/>`).join('') : '';
  const sun = isDay
    ? `<circle cx="285" cy="${150 - Math.min(40, 40 - aqi / 10)}" r="62" fill="${sunColor}" opacity=".25"/><circle cx="285" cy="${150 - Math.min(40, 40 - aqi / 10)}" r="40" fill="${sunColor}"/>`
    : `<circle cx="285" cy="95" r="30" fill="#fef9c3"/><circle cx="296" cy="88" r="26" fill="#312e81"/>`;
  const trees = level.key === 'good' || level.key === 'moderate'
    ? [[34,214],[372,210]].map(([x,y]) => `<rect x="${x-2}" y="${y}" width="4" height="22" fill="#14532d"/><circle cx="${x}" cy="${y-6}" r="14" fill="#16a34a"/>`).join('') : '';
  const smoke = aqi > 150
    ? `<g class="drift-slow" fill="#3f3f46" opacity=".5"><circle cx="138" cy="112" r="10"/><circle cx="150" cy="96" r="14"/><circle cx="168" cy="82" r="18"/></g>` : '';
  const rain = rainy ? Array.from({ length: 14 }, (_, i) => `<line x1="${20 + i * 28}" y1="40" x2="${12 + i * 28}" y2="70" stroke="#e0f2fe" stroke-width="2" opacity=".6"/>`).join('') : '';

  return `<svg viewBox="0 0 400 270" role="img" aria-label="Skyline illustration for ${level.label} air quality" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="1" stop-color="${skyBottom}"/></linearGradient>
      <linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c2a38a" stop-opacity="${haze * 0.5}"/><stop offset="1" stop-color="#d6b79a" stop-opacity="${haze}"/></linearGradient>
    </defs>
    <rect width="400" height="270" fill="url(#sky)"/>
    ${stars}${sun}
    <g class="drift" fill="#fff" opacity="${isDay ? 0.75 : 0.25}"><ellipse cx="90" cy="60" rx="38" ry="11"/><ellipse cx="116" cy="52" rx="24" ry="10"/><ellipse cx="320" cy="40" rx="30" ry="9"/></g>
    <path d="M0 190 Q70 150 150 185 T300 175 T400 190 V270 H0Z" fill="#0f172a" opacity=".25"/>
    <rect x="0" y="0" width="400" height="270" fill="url(#hz)"/>
    <g fill="#1e293b" opacity=".92">
      ${buildings.map(([x, h, w]) => `<rect x="${x}" y="${240 - h}" width="${w}" height="${h}" rx="2"/>`).join('')}
    </g>
    <g fill="#fde68a" opacity="${isDay ? 0.0 : 0.9}">
      ${buildings.map(([x, h]) => `<rect x="${x + 8}" y="${240 - h + 12}" width="5" height="7"/><rect x="${x + 20}" y="${240 - h + 30}" width="5" height="7"/>`).join('')}
    </g>
    <rect x="132" y="108" width="10" height="${240 - 108 - 0}" fill="#0f172a" opacity=".0"/>
    ${smoke}${rain}
    <rect x="0" y="240" width="400" height="30" fill="#0f172a" opacity=".85"/>
    ${trees}
    <rect x="0" y="0" width="400" height="270" fill="#a8a29e" opacity="${haze * 0.28}"/>
  </svg>`;
}

// ---------- Actions ----------
async function load(taskFn) {
  hideBanner();
  setLoading(true);
  try {
    const { lat, lon, name } = await taskFn();
    const data = await fetchConditions(lat, lon);
    render(name, data);
    $('cityInput').value = name.replace(/ \(.*\)$/, '');
  } catch (err) {
    console.error(err);
    const offline = !navigator.onLine || err instanceof TypeError;
    showBanner(offline ? 'Network problem: check your internet connection and try again.' : err.message);
  } finally {
    setLoading(false);
  }
}

const searchCity = (q) => load(() => geocode(q));

function locateMe() {
  if (!('geolocation' in navigator)) return showBanner('Your browser does not support location. Search for a city instead.');
  hideBanner();
  setLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => load(async () => {
      const { latitude: lat, longitude: lon } = pos.coords;
      return { lat, lon, name: await reverseGeocode(lat, lon) };
    }),
    (err) => {
      setLoading(false);
      const msg = err.code === 1 ? 'Location permission was denied. Allow it in your browser settings or search for a city.'
        : 'Could not get your location. Try again or search for a city.';
      showBanner(msg);
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

// ---------- Theme ----------
function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark);
  try { localStorage.setItem('dada-aqi-theme', dark ? 'dark' : 'light'); } catch (_) {}
}

// ---------- Init ----------
$('searchForm').addEventListener('submit', (e) => { e.preventDefault(); searchCity($('cityInput').value); });
$('locateBtn').addEventListener('click', locateMe);
$('themeBtn').addEventListener('click', () => applyTheme(!document.documentElement.classList.contains('dark')));

(function init() {
  let saved = null;
  try { saved = localStorage.getItem('dada-aqi-theme'); } catch (_) {}
  applyTheme(saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches);
  searchCity('Dhanbad, Jharkhand');
})();
