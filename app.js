/* ════════════════════════════════════════════
   SkyCast AI — app.js
   All API calls go through /api/* (Netlify functions).
   No secrets ever touch the browser.
   ════════════════════════════════════════════ */

'use strict';

// ── AMBIENT CANVAS ──────────────────────────────
(function ambientBg() {
  const canvas = document.getElementById('ambient-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, orbs = [];

  const ORBS = [
    { x: 0.15, y: 0.20, r: 0.38, color: [28, 110, 164],  speed: 0.00018 },
    { x: 0.75, y: 0.15, r: 0.30, color: [42, 191, 191],  speed: 0.00024 },
    { x: 0.55, y: 0.75, r: 0.35, color: [12,  40,  80],  speed: 0.00020 },
    { x: 0.88, y: 0.65, r: 0.25, color: [100, 60, 180],  speed: 0.00015 },
  ];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function init() {
    orbs = ORBS.map(o => ({ ...o, phase: Math.random() * Math.PI * 2 }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    orbs.forEach(o => {
      const px = (o.x + Math.sin(t * o.speed + o.phase) * 0.06) * W;
      const py = (o.y + Math.cos(t * o.speed * 1.3 + o.phase) * 0.06) * H;
      const r  = o.r * Math.min(W, H);
      const g  = ctx.createRadialGradient(px, py, 0, px, py, r);
      const [rv, gv, bv] = o.color;
      g.addColorStop(0,   `rgba(${rv},${gv},${bv},0.18)`);
      g.addColorStop(0.5, `rgba(${rv},${gv},${bv},0.06)`);
      g.addColorStop(1,   'transparent');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  init();
  window.addEventListener('resize', resize);
  requestAnimationFrame(draw);
})();


// ── CLOCK ────────────────────────────────────────
(function clock() {
  function tick() {
    const now = new Date();
    document.getElementById('nav-clock').textContent =
      now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('nav-date').textContent =
      now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  tick();
  setInterval(tick, 1000);
})();


// ── INPUT HELPERS ────────────────────────────────
const cityInput = document.getElementById('city-input');
const clearBtn  = document.getElementById('clear-btn');

cityInput.addEventListener('input', () => {
  clearBtn.style.display = cityInput.value ? 'block' : 'none';
});
clearBtn.addEventListener('click', () => {
  cityInput.value = '';
  clearBtn.style.display = 'none';
  cityInput.focus();
});
cityInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleSearch();
});


// ── ERROR BAR ────────────────────────────────────
function showError(msg) {
  const bar = document.getElementById('error-bar');
  bar.style.display = 'block';
  bar.textContent = '⚠ ' + msg;
}
function hideError() {
  document.getElementById('error-bar').style.display = 'none';
}


// ── BUTTON STATE ─────────────────────────────────
function setBtn(id, loading, label) {
  const el = document.getElementById(id);
  el.disabled = loading;
  el.innerHTML = loading
    ? `<span class="spinner"></span>${label}`
    : label;
}


// ── WEATHER EMOJI MAP ────────────────────────────
function weatherEmoji(id, icon) {
  const night = icon && icon.endsWith('n');
  if (id >= 200 && id < 300) return '⛈️';
  if (id >= 300 && id < 400) return '🌦️';
  if (id >= 500 && id < 510) return '🌧️';
  if (id === 511)             return '🌨️';
  if (id >= 520 && id < 600) return '🌧️';
  if (id >= 600 && id < 700) return '❄️';
  if (id >= 700 && id < 800) return '🌫️';
  if (id === 800) return night ? '🌙' : '☀️';
  if (id === 801) return '🌤️';
  if (id === 802) return '⛅';
  return '☁️';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function windDir(deg) {
  const dirs = ['N','NE','E','SE','S','SW','W','NW'];
  return dirs[Math.round((deg || 0) / 45) % 8];
}

function fmtTime(unix, tzOffset) {
  return new Date((unix + tzOffset) * 1000).toISOString().slice(11, 16);
}


// ── FETCH via Netlify functions ──────────────────
async function apiFetch(path) {
  const res = await fetch(path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}


// ── GEO LOOKUP → WEATHER ────────────────────────
async function fetchByCity(city) {
  const geo = await apiFetch(`/api/weather?endpoint=geo&q=${encodeURIComponent(city)}`);
  if (!geo.length) throw new Error('City not found. Try a different spelling.');
  const { lat, lon } = geo[0];
  await fetchWeatherByCoords(lat, lon);
}

async function fetchWeatherByCoords(lat, lon) {
  const [curr, fore] = await Promise.all([
    apiFetch(`/api/weather?endpoint=weather&lat=${lat}&lon=${lon}`),
    apiFetch(`/api/weather?endpoint=forecast&lat=${lat}&lon=${lon}`),
  ]);
  renderWeather(curr, fore);
}


// ── RENDER WEATHER ───────────────────────────────
function renderWeather(curr, fore) {
  document.getElementById('landing').style.display = 'none';
  const panel = document.getElementById('weather-panel');
  panel.style.display = 'block';

  const wid   = curr.weather[0].id;
  const icon  = curr.weather[0].icon;
  const emoji = weatherEmoji(wid, icon);

  // Hero
  document.getElementById('hero-city').textContent =
    `${curr.name}, ${curr.sys.country}`;
  document.getElementById('hero-icon').textContent = emoji;
  document.getElementById('hero-cond-main').textContent = curr.weather[0].main;
  document.getElementById('hero-cond-desc').textContent = curr.weather[0].description;
  document.getElementById('hero-temp').innerHTML =
    `${Math.round(curr.main.temp)}<sup>°C</sup>`;
  document.getElementById('hero-feels').textContent =
    `Feels like ${Math.round(curr.main.feels_like)}°C`;
  document.getElementById('hero-hilo').textContent =
    `H: ${Math.round(curr.main.temp_max)}° · L: ${Math.round(curr.main.temp_min)}°`;

  // Stats
  document.getElementById('s-humidity').textContent = curr.main.humidity;
  document.getElementById('s-wind').textContent =
    `${Math.round(curr.wind.speed * 3.6)} ${windDir(curr.wind.deg)}`;
  document.getElementById('s-vis').textContent =
    ((curr.visibility || 10000) / 1000).toFixed(1);
  document.getElementById('s-pressure').textContent = curr.main.pressure;

  const tz = curr.timezone;
  document.getElementById('s-sunrise').textContent = fmtTime(curr.sys.sunrise, tz);
  document.getElementById('s-sunset').textContent  = fmtTime(curr.sys.sunset,  tz);

  // Forecast
  renderForecast(fore);

  // AI suggestions
  fetchActivities(curr);

  setBtn('search-btn', false, 'Search');
  setBtn('locate-btn', false, svgLocate() + ' My Location');
}


// ── FORECAST ────────────────────────────────────
function renderForecast(fore) {
  const byDay = {};
  fore.list.forEach(item => {
    const key = new Date(item.dt * 1000).toDateString();
    if (!byDay[key]) byDay[key] = { label: DAYS[new Date(item.dt * 1000).getDay()], items: [] };
    byDay[key].items.push(item);
  });

  const container = document.getElementById('forecast-row');
  container.innerHTML = Object.values(byDay).slice(0, 5).map(d => {
    const temps = d.items.map(i => i.main.temp);
    const hi = Math.round(Math.max(...temps));
    const lo = Math.round(Math.min(...temps));
    const mid = d.items[Math.floor(d.items.length / 2)];
    return `<div class="fc-card">
      <div class="fc-day">${d.label}</div>
      <div class="fc-icon">${weatherEmoji(mid.weather[0].id, mid.weather[0].icon)}</div>
      <div class="fc-hi">${hi}°</div>
      <div class="fc-lo">${lo}°</div>
    </div>`;
  }).join('');
}


// ── AI ACTIVITY SUGGESTIONS ──────────────────────
async function fetchActivities(curr) {
  const wrap = document.getElementById('activities-wrap');
  wrap.innerHTML = `<div class="ai-loading">
    <div class="dots"><span></span><span></span><span></span></div>
    Claude is reading the conditions and crafting your activity plan…
  </div>`;

  try {
    const payload = {
      city:       curr.name,
      country:    curr.sys.country,
      condition:  curr.weather[0].description,
      temp:       curr.main.temp,
      feelsLike:  curr.main.feels_like,
      humidity:   curr.main.humidity,
      windKph:    curr.wind.speed * 3.6,
      visibility: (curr.visibility || 10000) / 1000,
    };

    const res = await fetch('/api/ai-suggest', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'AI service error');
    }

    const { activities } = await res.json();
    renderActivities(activities);
  } catch (err) {
    wrap.innerHTML = `<div class="ai-loading" style="color:rgba(232,244,255,0.35)">
      Could not load AI suggestions — ${err.message}
    </div>`;
  }
}

function renderActivities(list) {
  const wrap = document.getElementById('activities-wrap');
  wrap.innerHTML = `<div class="activities-grid">
    ${list.map(a => `
      <div class="act-card">
        <div class="act-emoji">${a.emoji}</div>
        <div class="act-title">${a.title}</div>
        <div class="act-desc">${a.description}</div>
        <span class="act-tag">${a.tag}</span>
      </div>`).join('')}
  </div>`;
}


// ── SVG HELPERS ──────────────────────────────────
function svgLocate() {
  return `<svg viewBox="0 0 20 20" fill="none" width="15" height="15" style="flex-shrink:0"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
}


// ── HANDLERS ────────────────────────────────────
window.handleSearch = async function () {
  const city = cityInput.value.trim();
  if (!city) { showError('Enter a city name to search.'); return; }
  hideError();
  setBtn('search-btn', true, 'Searching…');
  try {
    await fetchByCity(city);
  } catch (e) {
    showError(e.message);
    setBtn('search-btn', false, 'Search');
  }
};

window.handleLocate = function () {
  hideError();
  if (!navigator.geolocation) {
    showError('Geolocation is not supported by your browser.');
    return;
  }
  setBtn('locate-btn', true, 'Locating…');
  navigator.geolocation.getCurrentPosition(
    async pos => {
      try {
        await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      } catch (e) {
        showError(e.message);
        setBtn('locate-btn', false, svgLocate() + ' My Location');
      }
    },
    () => {
      showError('Location access denied — please search by city name instead.');
      setBtn('locate-btn', false, svgLocate() + ' My Location');
    }
  );
};
