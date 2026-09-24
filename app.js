(() => {
  const svgOut = '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M224 104a8 8 0 0 1-16 0V59.3l-66.3 66.4a8 8 0 0 1-11.4-11.4L196.7 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8Z"></path></svg>';
  const svgEdit = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M227.3 73.4 182.6 28.7a16 16 0 0 0-22.6 0L36.7 152a15.9 15.9 0 0 0-4.7 11.3V208a8 8 0 0 0 8 8h44.7a15.9 15.9 0 0 0 11.3-4.7L227.3 96a16 16 0 0 0 0-22.6ZM82.7 200H48v-34.7l88-88L170.7 112ZM184 100.7 155.3 72 172 55.3 200.7 84Z"></path></svg>';
  const svgTrash = '<svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor"><path d="M216 48h-40v-8a24 24 0 0 0-24-24h-48a24 24 0 0 0-24 24v8H40a8 8 0 0 0 0 16h8v144a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16V64h8a8 8 0 0 0 0-16ZM96 40a8 8 0 0 1 8-8h48a8 8 0 0 1 8 8v8H96Zm96 168H64V64h128Zm-80-104v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Zm48 0v64a8 8 0 0 1-16 0v-64a8 8 0 0 1 16 0Z"></path></svg>';

  const hostOf = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hasHover = window.matchMedia('(hover: hover)').matches;

  // ---- DOM refs ----
  const authArea = document.getElementById('authArea');
  const landingView = document.getElementById('landingView');
  const hubView = document.getElementById('hubView');
  const adminPanel = document.getElementById('adminPanel');
  const appGrid = document.getElementById('appGrid');
  const hubSubtitle = document.getElementById('hubSubtitle');

  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const bypassBtn = document.getElementById('bypassBtn');

  const addAppForm = document.getElementById('addAppForm');
  const addAppError = document.getElementById('addAppError');
  const adminAppList = document.getElementById('adminAppList');

  const addViewerForm = document.getElementById('addViewerForm');
  const addViewerError = document.getElementById('addViewerError');
  const viewerList = document.getElementById('viewerList');

  const overlay = document.getElementById('previewOverlay');
  const panel = document.getElementById('previewPanel');
  const previewName = document.getElementById('previewName');
  const previewStatus = document.getElementById('previewStatus');
  const previewHost = document.getElementById('previewHost');
  const previewOpenBtn = document.getElementById('previewOpenBtn');
  const previewFrame = document.getElementById('previewFrame');
  const previewCloseBtn = document.getElementById('previewCloseBtn');

  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarContent = document.getElementById('sidebarContent');

  const weatherChips = document.getElementById('weatherChips');
  const weatherAddForm = document.getElementById('weatherAddForm');
  const weatherZipInput = document.getElementById('weatherZipInput');
  const weatherError = document.getElementById('weatherError');
  const weatherCompact = document.getElementById('weatherCompact');
  const weatherCompactBody = document.getElementById('weatherCompactBody');
  const weatherHourly = document.getElementById('weatherHourly');

  const calendarPrevBtn = document.getElementById('calendarPrevBtn');
  const calendarNextBtn = document.getElementById('calendarNextBtn');
  const calendarLabel = document.getElementById('calendarLabel');
  const calendarGrid = document.getElementById('calendarGrid');
  const calendarDayPanel = document.getElementById('calendarDayPanel');

  const notesWidgetCard = document.getElementById('notesWidgetCard');
  const addNoteForm = document.getElementById('addNoteForm');
  const notesList = document.getElementById('notesList');

  // ---- State ----
  let apps = [];
  let role = null; // null | 'viewer' | 'admin'
  let username = null;
  let publicMode = false; // true once the user hits "continue without signing in"
  let hoverTimer = null;
  let openIndex = null;

  // ---- API helpers ----
  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function loadApps() {
    const data = await api('/api/apps');
    apps = data.apps;
    role = data.role;
    username = data.username;
    return data;
  }

  // ---- View switching ----
  function show(view) {
    landingView.hidden = view !== 'landing';
    hubView.hidden = view !== 'hub';
    adminPanel.hidden = view !== 'hub' || role !== 'admin';
  }

  function renderAuthArea() {
    if (role === 'admin' || role === 'viewer') {
      authArea.innerHTML = `
        <span class="auth-user">${username} <span class="tag tag-accent">${role === 'admin' ? 'Admin' : 'Viewer'}</span></span>
        <button class="btn btn-ghost" id="logoutBtn">Log out</button>
      `;
      document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    } else if (publicMode) {
      authArea.innerHTML = `<button class="btn btn-ghost" id="signInBtn">Sign in</button>`;
      document.getElementById('signInBtn').addEventListener('click', () => {
        publicMode = false;
        show('landing');
      });
    } else {
      authArea.innerHTML = '';
    }
  }

  function renderHub() {
    const visibleApps = role ? apps : apps.filter((a) => a.status === 'Live');
    hubSubtitle.textContent = role === 'admin'
      ? 'Signed in as admin — every app is listed below, including Beta.'
      : role === 'viewer'
        ? 'All apps, including Beta releases.'
        : '';

    appGrid.innerHTML = '';
    visibleApps.forEach((app) => appGrid.appendChild(buildCard(app)));
    rescale();
    if (role === 'admin') renderAdminAppList();

    notesWidgetCard.hidden = !role;
  }

  function buildCard(app) {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = app.url;
    card.target = '_blank';
    card.rel = 'noopener';

    const previewHtml = app.logo
      ? `
        <div class="card-logo-plate">
          <img src="${app.logo}" alt="${app.name} logo">
        </div>
      `
      : `
        <div class="card-preview">
          <iframe src="${app.url}" title="${app.name}" tabindex="-1" loading="lazy"></iframe>
          <div class="card-preview-fade"></div>
        </div>
      `;

    card.innerHTML = `
      <div class="card-body">
        <div class="card-row">
          <h2 class="card-name">${app.name}</h2>
          <span class="tag tag-accent">${app.status}</span>
        </div>
        <p class="card-blurb">${app.blurb}</p>
        <div class="card-host">
          <span>${hostOf(app.url)}</span>
          ${svgOut}
        </div>
      </div>
      ${previewHtml}
    `;

    if (hasHover) {
      card.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => openPreview(app), 600);
      });
      card.addEventListener('mouseleave', () => {
        if (openIndex === null) {
          clearTimeout(hoverTimer);
        } else {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(closePreview, 250);
        }
      });
    }

    return card;
  }

  function rescale() {
    document.querySelectorAll('.app-card').forEach((card) => {
      const width = card.getBoundingClientRect().width;
      const scale = width / 1280;
      const iframe = card.querySelector('.card-preview iframe');
      if (iframe) iframe.style.transform = `scale(${scale})`;
    });
  }
  new ResizeObserver(rescale).observe(appGrid);

  function openPreview(app) {
    openIndex = app.id;
    previewName.textContent = app.name;
    previewStatus.textContent = app.status;
    previewHost.textContent = hostOf(app.url);
    previewOpenBtn.href = app.url;
    previewFrame.src = app.url;
    overlay.hidden = false;
  }
  function closePreview() {
    openIndex = null;
    overlay.hidden = true;
    previewFrame.src = 'about:blank';
  }
  panel.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
  panel.addEventListener('mouseleave', () => {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(closePreview, 200);
  });
  previewCloseBtn.addEventListener('click', () => { clearTimeout(hoverTimer); closePreview(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openIndex !== null) { clearTimeout(hoverTimer); closePreview(); }
  });

  // ---- Admin: app management ----
  function renderAdminAppList() {
    adminAppList.innerHTML = '';
    apps.forEach((app) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <div class="admin-row-main">
          <strong>${app.name}</strong>
          <span class="tag tag-accent">${app.status}</span>
          <span class="admin-row-url">${app.url}</span>
        </div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost btn-icon" data-action="edit" aria-label="Edit ${app.name}">${svgEdit}</button>
          <button class="btn btn-ghost btn-icon" data-action="delete" aria-label="Delete ${app.name}">${svgTrash}</button>
        </div>
      `;
      row.querySelector('[data-action="edit"]').addEventListener('click', () => openEditRow(row, app));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => handleDeleteApp(app));
      adminAppList.appendChild(row);
    });
  }

  function openEditRow(row, app) {
    row.innerHTML = `
      <form class="admin-edit-form">
        <input class="input" name="name" value="${app.name}" required>
        <input class="input" name="url" value="${app.url}" required>
        <input class="input" name="blurb" value="${app.blurb}">
        <input class="input" name="logo" value="${app.logo || ''}" placeholder="Logo image URL (optional)">
        <select class="input" name="status">
          <option value="Live" ${app.status === 'Live' ? 'selected' : ''}>Live</option>
          <option value="Beta" ${app.status === 'Beta' ? 'selected' : ''}>Beta</option>
        </select>
        <div class="admin-row-actions">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-ghost" data-action="cancel">Cancel</button>
        </div>
      </form>
    `;
    row.querySelector('[data-action="cancel"]').addEventListener('click', () => renderAdminAppList());
    row.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        const data = await api('/api/apps', {
          method: 'PUT',
          body: JSON.stringify({
            id: app.id,
            name: fd.get('name'),
            url: fd.get('url'),
            blurb: fd.get('blurb'),
            status: fd.get('status'),
            logo: fd.get('logo'),
          }),
        });
        apps = data.apps;
        renderHub();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  async function handleDeleteApp(app) {
    if (!confirm(`Delete "${app.name}"? This can't be undone.`)) return;
    try {
      const data = await api('/api/apps', { method: 'DELETE', body: JSON.stringify({ id: app.id }) });
      apps = data.apps;
      renderHub();
    } catch (err) {
      alert(err.message);
    }
  }

  addAppForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addAppError.hidden = true;
    const fd = new FormData(addAppForm);
    try {
      const data = await api('/api/apps', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          url: fd.get('url'),
          blurb: fd.get('blurb'),
          status: fd.get('status'),
          logo: fd.get('logo'),
        }),
      });
      apps = data.apps;
      addAppForm.reset();
      renderHub();
    } catch (err) {
      addAppError.textContent = err.message;
      addAppError.hidden = false;
    }
  });

  // ---- Admin: viewer accounts ----
  async function loadViewers() {
    try {
      const data = await api('/api/users');
      renderViewerList(data.viewers);
    } catch (err) {
      viewerList.innerHTML = `<p class="form-error">${err.message}</p>`;
    }
  }

  function renderViewerList(viewers) {
    if (!viewers.length) {
      viewerList.innerHTML = '<p class="text-muted">No viewer accounts yet.</p>';
      return;
    }
    viewerList.innerHTML = '';
    viewers.forEach((v) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <div class="admin-row-main"><strong>${v.username}</strong></div>
        <div class="admin-row-actions">
          <button class="btn btn-ghost btn-icon" aria-label="Delete ${v.username}">${svgTrash}</button>
        </div>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        if (!confirm(`Remove viewer account "${v.username}"?`)) return;
        try {
          const data = await api('/api/users', { method: 'DELETE', body: JSON.stringify({ username: v.username }) });
          renderViewerList(data.viewers);
        } catch (err) {
          alert(err.message);
        }
      });
      viewerList.appendChild(row);
    });
  }

  addViewerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    addViewerError.hidden = true;
    const fd = new FormData(addViewerForm);
    try {
      const data = await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
      });
      addViewerForm.reset();
      renderViewerList(data.viewers);
    } catch (err) {
      addViewerError.textContent = err.message;
      addViewerError.hidden = false;
    }
  });

  // ---- Sidebar collapse ----
  function setSidebarExpanded(expanded) {
    sidebarContent.hidden = !expanded;
    sidebarToggle.setAttribute('aria-expanded', String(expanded));
  }
  sidebarToggle.addEventListener('click', () => {
    setSidebarExpanded(sidebarContent.hidden);
  });
  setSidebarExpanded(window.innerWidth > 900);

  // ---- Weather widget (multiple saved zip codes) ----
  const WEATHER_ZIPS_KEY = 'dinto_hub_weather_zips';
  const WEATHER_ACTIVE_KEY = 'dinto_hub_weather_active_zip';
  const DEFAULT_ZIP = '06762';

  const WEATHER_CODES = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'], 48: ['Fog', '🌫️'],
    51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Dense drizzle', '🌦️'],
    56: ['Freezing drizzle', '🌧️'], 57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌧️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'], 67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '❄️'], 73: ['Snow', '❄️'], 75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '❄️'],
    80: ['Rain showers', '🌦️'], 81: ['Rain showers', '🌦️'], 82: ['Violent showers', '🌧️'],
    85: ['Snow showers', '🌨️'], 86: ['Snow showers', '🌨️'],
    95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm w/ hail', '⛈️'], 99: ['Thunderstorm w/ hail', '⛈️'],
  };
  function weatherLookup(code) {
    return WEATHER_CODES[code] || ['—', '🌡️'];
  }

  let savedZips = [];
  let activeZip = null;
  let hourlyOpen = false;
  const weatherCache = {}; // zip -> { place, temp, label, icon, hourly: [...] }

  function loadZipsFromStorage() {
    try {
      const raw = localStorage.getItem(WEATHER_ZIPS_KEY);
      savedZips = raw ? JSON.parse(raw) : [];
    } catch {
      savedZips = [];
    }
    if (!savedZips.length) savedZips = [DEFAULT_ZIP];
    activeZip = localStorage.getItem(WEATHER_ACTIVE_KEY) || savedZips[0];
    if (!savedZips.includes(activeZip)) activeZip = savedZips[0];
  }
  function saveZipsToStorage() {
    localStorage.setItem(WEATHER_ZIPS_KEY, JSON.stringify(savedZips));
    localStorage.setItem(WEATHER_ACTIVE_KEY, activeZip);
  }

  async function fetchWeatherForZip(zip) {
    const geoRes = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!geoRes.ok) throw new Error('Zip code not found');
    const geo = await geoRes.json();
    const place = geo.places && geo.places[0];
    if (!place) throw new Error('Zip code not found');
    const lat = place.latitude;
    const lon = place.longitude;
    const wRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&temperature_unit=fahrenheit&forecast_days=2`
    );
    if (!wRes.ok) throw new Error('Weather lookup failed');
    const wData = await wRes.json();
    const [label, icon] = weatherLookup(wData.current.weather_code);

    const nowIso = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    let startIdx = wData.hourly.time.findIndex((t) => t.slice(0, 13) >= nowIso);
    if (startIdx === -1) startIdx = 0;
    const hourly = [];
    for (let i = startIdx; i < Math.min(startIdx + 12, wData.hourly.time.length); i++) {
      const [hLabel, hIcon] = weatherLookup(wData.hourly.weather_code[i]);
      hourly.push({
        time: wData.hourly.time[i],
        temp: Math.round(wData.hourly.temperature_2m[i]),
        precip: wData.hourly.precipitation_probability[i],
        icon: hIcon,
        label: hLabel,
      });
    }

    return {
      place: `${place['place name']}, ${place['state abbreviation']}`,
      temp: Math.round(wData.current.temperature_2m),
      label,
      icon,
      hourly,
    };
  }

  function renderWeatherChips() {
    weatherChips.innerHTML = '';
    savedZips.forEach((zip) => {
      const chip = document.createElement('span');
      chip.className = 'weather-chip' + (zip === activeZip ? ' active' : '');
      chip.innerHTML = `<span data-zip="${zip}">${zip}</span>${savedZips.length > 1 ? `<span class="chip-remove" data-remove="${zip}">×</span>` : ''}`;
      chip.querySelector('[data-zip]').addEventListener('click', () => {
        activeZip = zip;
        hourlyOpen = false;
        saveZipsToStorage();
        renderWeatherChips();
        renderWeatherCompact();
      });
      const removeEl = chip.querySelector('[data-remove]');
      if (removeEl) {
        removeEl.addEventListener('click', (e) => {
          e.stopPropagation();
          savedZips = savedZips.filter((z) => z !== zip);
          delete weatherCache[zip];
          if (activeZip === zip) activeZip = savedZips[0];
          saveZipsToStorage();
          renderWeatherChips();
          renderWeatherCompact();
        });
      }
      weatherChips.appendChild(chip);
    });
  }

  async function renderWeatherCompact() {
    if (!activeZip) {
      weatherCompactBody.innerHTML = '<span class="text-muted">Add a zip code above</span>';
      weatherHourly.hidden = true;
      return;
    }
    weatherError.hidden = true;
    weatherCompactBody.innerHTML = '<span class="text-muted">Loading…</span>';
    try {
      const w = weatherCache[activeZip] || await fetchWeatherForZip(activeZip);
      weatherCache[activeZip] = w;
      weatherCompactBody.innerHTML = `
        <span class="weather-icon">${w.icon}</span>
        <span class="weather-temp">${w.temp}°F</span>
        <span class="weather-desc">${w.label} · ${w.place}</span>
      `;
      if (hourlyOpen) renderWeatherHourly(w);
    } catch (err) {
      weatherCompactBody.innerHTML = '';
      weatherError.textContent = err.message;
      weatherError.hidden = false;
    }
  }

  function renderWeatherHourly(w) {
    weatherHourly.hidden = false;
    weatherHourly.innerHTML = w.hourly.map((h) => {
      const hour = new Date(h.time).toLocaleTimeString('en-US', { hour: 'numeric' });
      return `
        <div class="weather-hour">
          <span>${hour}</span>
          <span class="hour-icon">${h.icon}</span>
          <span class="hour-temp">${h.temp}°</span>
          <span class="hour-precip">${h.precip}%</span>
        </div>
      `;
    }).join('');
  }

  weatherCompact.addEventListener('click', () => {
    hourlyOpen = !hourlyOpen;
    if (!hourlyOpen) {
      weatherHourly.hidden = true;
    } else if (activeZip && weatherCache[activeZip]) {
      renderWeatherHourly(weatherCache[activeZip]);
    }
  });

  weatherAddForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = weatherZipInput.value.trim();
    if (!/^\d{5}$/.test(zip)) {
      weatherError.textContent = 'Enter a 5-digit zip code';
      weatherError.hidden = false;
      return;
    }
    if (!savedZips.includes(zip)) savedZips.push(zip);
    activeZip = zip;
    hourlyOpen = false;
    saveZipsToStorage();
    weatherZipInput.value = '';
    renderWeatherChips();
    renderWeatherCompact();
  });

  function initWeather() {
    loadZipsFromStorage();
    renderWeatherChips();
    renderWeatherCompact();
  }

  // ---- Calendar widget (private per account) ----
  let calendarEvents = [];
  const today = new Date();
  let calendarViewDate = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDateStr = toDateStr(today);

  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function loadCalendarEvents() {
    try {
      const data = await api('/api/events');
      calendarEvents = data.events;
    } catch (err) {
      calendarEvents = [];
    }
  }

  function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    calendarLabel.textContent = calendarViewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = toDateStr(new Date());

    const eventsByDate = {};
    calendarEvents.forEach((ev) => {
      (eventsByDate[ev.date] = eventsByDate[ev.date] || []).push(ev);
    });

    let html = '';
    ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => {
      html += `<div class="calendar-weekday">${d}</div>`;
    });
    for (let i = 0; i < firstWeekday; i++) {
      html += '<div class="calendar-cell empty"></div>';
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const classes = ['calendar-cell'];
      if (dateStr === todayStr) classes.push('today');
      if (dateStr === selectedDateStr) classes.push('selected');
      const hasEvents = eventsByDate[dateStr] && eventsByDate[dateStr].length;
      html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${day}${hasEvents ? '<span class="event-dot"></span>' : ''}</div>`;
    }
    calendarGrid.innerHTML = html;

    calendarGrid.querySelectorAll('.calendar-cell:not(.empty)').forEach((cell) => {
      cell.addEventListener('click', () => {
        selectedDateStr = cell.dataset.date;
        renderCalendar();
      });
    });

    renderDayPanel(eventsByDate[selectedDateStr] || []);
  }

  function renderDayPanel(dayEvents) {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const label = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    let html = `<h4>${label}</h4>`;
    if (dayEvents.length) {
      dayEvents.forEach((ev) => {
        html += `
          <div class="calendar-event-item" data-id="${ev.id}">
            <div>
              <div class="event-title">${ev.title}</div>
              ${ev.notes ? `<div class="event-notes">${ev.notes}</div>` : ''}
            </div>
            ${role ? `<button class="btn btn-ghost btn-icon" data-action="delete-event" aria-label="Delete event">${svgTrash}</button>` : ''}
          </div>
        `;
      });
    } else {
      html += '<p class="text-muted">No events.</p>';
    }

    if (role) {
      html += `
        <form class="calendar-add-form" id="addEventForm">
          <input class="input input-sm" name="title" placeholder="Event title" required>
          <input class="input input-sm" name="notes" placeholder="Notes (optional)">
          <button class="btn btn-primary" type="submit">Add event</button>
        </form>
      `;
    }

    calendarDayPanel.innerHTML = html;

    if (role) {
      calendarDayPanel.querySelectorAll('[data-action="delete-event"]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.closest('.calendar-event-item').dataset.id;
          try {
            const data = await api('/api/events', { method: 'DELETE', body: JSON.stringify({ id }) });
            calendarEvents = data.events;
            renderCalendar();
          } catch (err) {
            alert(err.message);
          }
        });
      });

      const addEventForm = document.getElementById('addEventForm');
      addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(addEventForm);
        try {
          const data = await api('/api/events', {
            method: 'POST',
            body: JSON.stringify({ date: selectedDateStr, title: fd.get('title'), notes: fd.get('notes') }),
          });
          calendarEvents = data.events;
          renderCalendar();
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  calendarPrevBtn.addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
    renderCalendar();
  });
  calendarNextBtn.addEventListener('click', () => {
    calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
    renderCalendar();
  });

  // ---- Notes widget (private per account) ----
  let notes = [];

  async function loadNotes() {
    if (!role) { notes = []; return; }
    try {
      const data = await api('/api/notes');
      notes = data.notes;
    } catch (err) {
      notes = [];
    }
  }

  function renderNotes() {
    if (!notes.length) {
      notesList.innerHTML = '<p class="text-muted">No notes yet.</p>';
      return;
    }
    notesList.innerHTML = '';
    notes.forEach((n) => {
      const row = document.createElement('div');
      row.className = 'note-item';
      row.innerHTML = `
        <span>${n.text}</span>
        <button class="btn btn-ghost btn-icon" aria-label="Delete note">${svgTrash}</button>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        try {
          const data = await api('/api/notes', { method: 'DELETE', body: JSON.stringify({ id: n.id }) });
          notes = data.notes;
          renderNotes();
        } catch (err) {
          alert(err.message);
        }
      });
      notesList.appendChild(row);
    });
  }

  addNoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(addNoteForm);
    const text = fd.get('text');
    if (!text || !text.trim()) return;
    try {
      const data = await api('/api/notes', { method: 'POST', body: JSON.stringify({ text }) });
      notes = data.notes;
      addNoteForm.reset();
      renderNotes();
    } catch (err) {
      alert(err.message);
    }
  });

  // ---- Auth ----
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const fd = new FormData(loginForm);
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username: fd.get('username'), password: fd.get('password') }),
      });
      publicMode = false;
      await loadApps();
      renderAuthArea();
      renderHub();
      show('hub');
      if (role === 'admin') loadViewers();
      await loadCalendarEvents();
      renderCalendar();
      await loadNotes();
      renderNotes();
    } catch (err) {
      loginError.textContent = err.message;
      loginError.hidden = false;
    }
  });

  bypassBtn.addEventListener('click', async () => {
    publicMode = true;
    renderAuthArea();
    renderHub();
    show('hub');
  });

  async function handleLogout() {
    await api('/api/logout', { method: 'POST' });
    role = null;
    username = null;
    publicMode = false;
    await loadApps();
    renderAuthArea();
    show('landing');
    calendarEvents = [];
    renderCalendar();
    notes = [];
    renderNotes();
  }

  // ---- Init ----
  (async function init() {
    try {
      await loadApps();
    } catch (err) {
      apps = [];
    }
    renderAuthArea();
    if (role === 'admin' || role === 'viewer') {
      renderHub();
      show('hub');
      if (role === 'admin') loadViewers();
    } else {
      show('landing');
    }
    initWeather();
    await loadCalendarEvents();
    renderCalendar();
    await loadNotes();
    renderNotes();
  })();
})();
