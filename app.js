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
  }

  function buildCard(app) {
    const card = document.createElement('a');
    card.className = 'app-card';
    card.href = app.url;
    card.target = '_blank';
    card.rel = 'noopener';

    card.innerHTML = `
      <div class="card-preview">
        <iframe src="${app.url}" title="${app.name}" tabindex="-1" loading="lazy"></iframe>
        <div class="card-preview-fade"></div>
      </div>
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
  })();
})();
