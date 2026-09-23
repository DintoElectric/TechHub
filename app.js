(() => {
  const apps = [
    {
      name: 'Dinto Tool Tracker',
      url: 'https://dintotool.netlify.app/',
      blurb: 'Tracks Tools',
      status: 'Beta',
    },
    {
      name: 'Dinto As-Built Viewer',
      url: 'https://asbuiltviewer.netlify.app/',
      blurb: 'Views As-Builts and Panel Schedules',
      status: 'Live',
    },
    {
      name: 'Dinto Delivery',
      url: 'https://dintodelivery.netlify.app/',
      blurb: 'Schedule pickups and deliveries',
      status: 'Beta',
    },
    {
      name: 'Dinto Prefab Catalog',
      url: 'https://prefabcatalog.netlify.app/',
      blurb: 'Request prefabs',
      status: 'Beta',
    },
  ];

  const HOVER_PREVIEW = true;
  const HOVER_DELAY = 600; // ms
  const LEAVE_CLOSE_DELAY = 250; // ms, closing panel after leaving a card
  const PANEL_LEAVE_DELAY = 200; // ms, closing panel after leaving the panel itself

  const hostOf = (url) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const hasHover = window.matchMedia('(hover: hover)').matches;

  const grid = document.getElementById('appGrid');
  const overlay = document.getElementById('previewOverlay');
  const panel = document.getElementById('previewPanel');
  const previewName = document.getElementById('previewName');
  const previewStatus = document.getElementById('previewStatus');
  const previewHost = document.getElementById('previewHost');
  const previewOpenBtn = document.getElementById('previewOpenBtn');
  const previewCloseBtn = document.getElementById('previewCloseBtn');
  const previewFrame = document.getElementById('previewFrame');

  let timer = null;
  let openIndex = null;

  function schedule(fn, ms) {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  }

  function openPreview(index) {
    openIndex = index;
    const app = apps[index];
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

  // Build cards
  const svgOut = '<svg width="12" height="12" viewBox="0 0 256 256" fill="currentColor"><path d="M224 104a8 8 0 0 1-16 0V59.3l-66.3 66.4a8 8 0 0 1-11.4-11.4L196.7 48H152a8 8 0 0 1 0-16h64a8 8 0 0 1 8 8Zm-40 24a8 8 0 0 0-8 8v72H48V80h72a8 8 0 0 0 0-16H48a16 16 0 0 0-16 16v128a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-72a8 8 0 0 0-8-8Z"></path></svg>';

  apps.forEach((app, i) => {
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

    if (HOVER_PREVIEW && hasHover) {
      card.addEventListener('mouseenter', () => {
        schedule(() => openPreview(i), HOVER_DELAY);
      });
      card.addEventListener('mouseleave', () => {
        if (openIndex === null) {
          clearTimeout(timer);
        } else {
          schedule(closePreview, LEAVE_CLOSE_DELAY);
        }
      });
    }

    grid.appendChild(card);
  });

  // Scale each card's iframe preview to fit (1280x800 native size)
  function rescale() {
    const cards = grid.querySelectorAll('.app-card');
    cards.forEach((card) => {
      const width = card.getBoundingClientRect().width;
      const scale = width / 1280;
      const iframe = card.querySelector('.card-preview iframe');
      if (iframe) iframe.style.transform = `scale(${scale})`;
    });
  }
  new ResizeObserver(rescale).observe(grid);
  rescale();

  // Panel hover keeps it open; leaving it (without re-entering a card) closes it
  panel.addEventListener('mouseenter', () => clearTimeout(timer));
  panel.addEventListener('mouseleave', () => {
    schedule(closePreview, PANEL_LEAVE_DELAY);
  });

  previewCloseBtn.addEventListener('click', () => {
    clearTimeout(timer);
    closePreview();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && openIndex !== null) {
      clearTimeout(timer);
      closePreview();
    }
  });
})();
