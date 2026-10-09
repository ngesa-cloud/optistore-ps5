// ==============================================================================
// OPTISTORE5 — HIGH-PERFORMANCE CLIENT-SIDE CATALOG ENGINE
// Engineered for PlayStation 5 Package Repositories & Remote Installers
// ==============================================================================

(function () {
  'use strict';

  // Catalog Sources
  const CATALOGS = {
    dlps:  { id: 'dlps',  label: 'DLPSGAME', url: 'dlps.json' },
    pippo: { id: 'pippo', label: '.exfat',   url: 'pippo.json' },
    pfs:   { id: 'pfs',   label: 'PFS',      url: 'pfs.json' }
  };

  const PASSWORDS_ARCHIVE = ['DLPSGAME.COM', 'downloadgameps3.com', 'hako', '[DLPSGAME.COM]'];
  const PASSWORDS_LOCK = ['pippo'];
  const PIPPO_HOSTS = ['pippo', 'pippolink', 'pippo.link', 'pippo.onl', 'pippolinks', 'pippo.co'];

  const CATEGORY_META = {
    game:   { label: 'Game', cls: 'cat-game' },
    dlc:    { label: 'DLC', cls: 'cat-dlc' },
    update: { label: 'Update', cls: 'cat-update' },
    app:    { label: 'App', cls: 'cat-app' },
    theme:  { label: 'Theme', cls: 'cat-theme' },
    demo:   { label: 'Demo', cls: 'cat-demo' }
  };

  const SORT_OPTIONS = [
    { id: 'updated',   label: 'Recently updated' },
    { id: 'name',      label: 'Name A–Z' },
    { id: 'name-desc', label: 'Name Z–A' },
    { id: 'category',  label: 'Category' },
    { id: 'links',     label: 'Most links' },
    { id: 'titleid',   label: 'Title ID' }
  ];

  // DOM Cache
  const $ = (id) => document.getElementById(id);
  const D = {};

  function cacheDom() {
    [
      'search', 'countPill', 'statTitles', 'statGames', 'statDlc', 'statLinks',
      'catalogTabs', 'tabCountDlps', 'tabCountPippo', 'tabCountPfs',
      'updateBanner', 'ubDot', 'ubLabel', 'ubTime', 'ubSep', 'ubSource', 'ubBadge', 'ubRefresh',
      'chipbar', 'grid', 'toasts', 'dropOverlay',
      'filterBtn', 'filterPopover', 'filterCount', 'filterClear', 'filterCatChips', 'filterRegion', 'filterToggles',
      'sortBtn', 'sortPopover', 'sortLabel', 'sortOptions',
      'modal', 'modalClose', 'mCover', 'mTitle', 'mSub', 'mChips', 'mCopyAll', 'mSource',
      'mPippoCallout', 'mIncludesSection', 'mIncludes', 'mSpecsSection', 'mSpecs', 'mLinkCount', 'mLinks',
      'passBtn', 'passModal', 'passPwListDlps', 'passPwListLocks',
      'ps5ConfigBtn', 'ps5Modal', 'ps5IpInput', 'ps5PortInput', 'savePs5Config', 'testPs5Ping'
    ].forEach(id => { D[id] = $(id); });
  }

  // Application State
  const state = {
    currentCatalogId: localStorage.getItem('opti_catalog') || 'dlps',
    catalogs: {
      dlps:  { items: [], loaded: false, error: null, lastUpdated: null },
      pippo: { items: [], loaded: false, error: null, lastUpdated: null },
      pfs:   { items: [], loaded: false, error: null, lastUpdated: null }
    },
    filters: {
      dlps:  makeDefaultFilters(),
      pippo: makeDefaultFilters(),
      pfs:   makeDefaultFilters()
    },
    filtered: [],
    ps5: {
      ip: localStorage.getItem('ps5_ip') || '',
      port: localStorage.getItem('ps5_port') || '12800'
    }
  };

  function makeDefaultFilters() {
    return {
      query: '',
      categories: [],
      region: '',
      sort: localStorage.getItem('opti_sort') || 'updated',
      hasLinks: false,
      hasPippo: false,
      hasUpdates: false,
      hasDlc: false,
      groupedOnly: false
    };
  }

  const active = () => state.catalogs[state.currentCatalogId];
  const activeFilters = () => state.filters[state.currentCatalogId];

  // Helper Utilities
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    const icon = kind === 'ok' ? '✓' : kind === 'err' ? '✕' : 'ℹ️';
    el.innerHTML = `<span style="font-weight:bold">${icon}</span> <span>${esc(msg)}</span>`;
    D.toasts.appendChild(el);
    setTimeout(() => { el.remove(); }, 3200);
  }

  function copyText(text, successMsg = 'Copied to clipboard') {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(successMsg, 'ok')).catch(() => fallbackCopy(text, successMsg));
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast(successMsg, 'ok');
    } catch (e) {
      toast('Copy failed', 'err');
    }
    document.body.removeChild(ta);
  }

  function hostOf(u) {
    try { return new URL(u, location.href).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function isPippoHost(host) {
    if (!host) return false;
    const h = host.toLowerCase();
    return PIPPO_HOSTS.some(p => h.includes(p));
  }

  function formatBytes(bytes) {
    const num = Number(bytes);
    if (!isFinite(num) || num <= 0) return '';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0, val = num;
    while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
    return `${val.toFixed(val >= 10 ? 1 : 2)} ${units[i]}`;
  }

  // Description parser
  function parseDescription(desc) {
    const out = { region: '', password: '', note: '', contributor: '', firmware: '', genre: '', extra: [] };
    if (!desc) return out;
    const lines = String(desc).split(/\r?\n/);
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const m = trimmed.match(/^([^:]+):\s*(.*)$/);
      if (m && m[2].length <= 300) {
        const k = m[1].toLowerCase().trim();
        const v = m[2].trim();
        if (k === 'region') out.region = v;
        else if (k === 'password') out.password = v;
        else if (k.includes('note')) out.note = v;
        else if (k === 'contributor') out.contributor = v;
        else if (k === 'firmware') out.firmware = v;
        else if (k === 'genre') out.genre = v;
        else out.extra.push({ k: m[1].trim(), v });
      } else {
        out.extra.push({ k: '', v: trimmed });
      }
    });
    return out;
  }

  // Catalog Normalization
  function normalize(raw) {
    if (!raw) return [];
    let list = [];
    if (Array.isArray(raw)) list = raw;
    else if (raw && Array.isArray(raw.packages)) list = raw.packages;
    else if (raw && raw.packages && typeof raw.packages === 'object') list = Object.values(raw.packages);

    return list.map(m => {
      if (!m || typeof m !== 'object') return null;
      const title = m.title || m.name || 'Untitled';
      const titleId = m.titleId || m.title_id || '';
      const links = [];
      let hasPippo = false;

      const rawLinks = m.downloadLinks || m.files || [];
      rawLinks.forEach(l => {
        if (!l) return;
        const url = typeof l === 'string' ? l : (l.url || l.link || '');
        if (!url) return;
        const host = hostOf(url);
        const pippo = isPippoHost(host);
        if (pippo) hasPippo = true;
        links.push({
          name: (typeof l === 'object' && (l.name || l.label)) || 'Download',
          url, host, pippo
        });
      });

      const cat = String(m.category || '').toLowerCase().trim() || 'game';
      const parsed = parseDescription(m.description);
      const size = m.sizeBytes != null ? m.sizeBytes : (m.size || '');

      return {
        title: String(title),
        titleId: String(titleId),
        category: cat,
        categories: [cat],
        version: m.version != null ? String(m.version) : '',
        posterUrl: m.posterUrl || m.poster_url || m.cover || '',
        description: String(m.description || ''),
        downloadSource: m.downloadSource || m.source || '',
        links,
        hasPippo,
        region: parsed.region,
        password: parsed.password,
        note: parsed.note,
        contributor: parsed.contributor,
        firmware: parsed.firmware,
        genre: parsed.genre,
        updatedAt: m.updatedAt || m.lastUpdated || parsed.updated || null,
        extra: parsed.extra,
        _sizeRaw: size,
        _sizeLabel: formatBytes(size),
        _search: (title + ' ' + titleId).toLowerCase(),
        _grouped: false,
        _groupCount: 1,
        _entries: []
      };
    }).filter(Boolean);
  }

  // PFS Grouping Engine
  function groupByTitleId(items) {
    const map = new Map();
    items.forEach((it, idx) => {
      const key = String(it.titleId || it.title || `__solo_${idx}`).toLowerCase().trim();
      if (!map.has(key)) {
        map.set(key, {
          ...it,
          categories: [...it.categories],
          links: [...it.links],
          extra: [...it.extra],
          _entries: [],
          _sizeRaw: Number(it._sizeRaw) || 0,
          _groupCount: 0
        });
      }
      const g = map.get(key);
      g._groupCount++;
      g._entries.push({
        category: it.category,
        version: it.version,
        linkCount: it.links.length,
        size: it._sizeLabel
      });

      if (it.category && !g.categories.includes(it.category)) g.categories.push(it.category);
      if (!g.posterUrl && it.posterUrl) g.posterUrl = it.posterUrl;
      if (!g.region && it.region) g.region = it.region;
    });

    const out = Array.from(map.values());
    out.forEach(g => {
      g._grouped = g._groupCount > 1;
      if (g._sizeRaw > 0) g._sizeLabel = formatBytes(g._sizeRaw);
    });
    return out;
  }

  // Catalog Fetcher
  async function loadCatalog(id, forceSync = false) {
    const cat = CATALOGS[id];
    if (!cat) return;

    D.ubDot.className = 'ub-dot';
    D.ubLabel.textContent = `Loading ${cat.label} (${cat.url})…`;

    try {
      const res = await fetch(cat.url + (forceSync ? `?t=${Date.now()}` : ''));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let items = normalize(data);
      if (id === 'pfs') items = groupByTitleId(items);

      state.catalogs[id].items = items;
      state.catalogs[id].loaded = true;
      state.catalogs[id].lastUpdated = new Date();

      updateTabCounts();
      buildStats();
      buildChips();
      apply();

      D.ubLabel.textContent = `${cat.label} loaded`;
      D.ubTime.textContent = `${items.length.toLocaleString()} titles available`;
      D.ubSource.textContent = `Source: ${cat.url}`;
      toast(`${cat.label} catalog loaded successfully`, 'ok');
    } catch (err) {
      console.error(err);
      D.ubDot.style.background = 'var(--err)';
      D.ubLabel.textContent = `Failed to load ${cat.label}`;
      D.ubTime.textContent = err.message;
      toast(`Error loading ${cat.label}: ${err.message}`, 'err');
    }
  }

  function updateTabCounts() {
    ['dlps', 'pippo', 'pfs'].forEach(id => {
      const el = D[`tabCount${id.charAt(0).toUpperCase() + id.slice(1)}`];
      if (el) el.textContent = state.catalogs[id].items.length || '0';
    });
  }

  function buildStats() {
    const items = active().items;
    let games = 0, dlc = 0, links = 0;
    items.forEach(it => {
      if (it.categories.includes('game')) games++;
      if (it.categories.includes('dlc') || it.categories.includes('update')) dlc++;
      links += it.links.length;
    });
    D.statTitles.textContent = items.length.toLocaleString();
    D.statGames.textContent = games.toLocaleString();
    D.statDlc.textContent = dlc.toLocaleString();
    D.statLinks.textContent = links.toLocaleString();
  }

  function buildChips() {
    const items = active().items;
    const counts = {};
    items.forEach(it => {
      it.categories.forEach(c => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });

    const curCats = activeFilters().categories;
    const allOn = curCats.length === 0;

    let html = `<button class="chip ${allOn ? 'on' : ''}" data-cat="all" type="button">All <span class="n">${items.length}</span></button>`;
    Object.keys(counts).forEach(c => {
      const meta = CATEGORY_META[c] || { label: c };
      const on = curCats.includes(c);
      html += `<button class="chip ${on ? 'on' : ''}" data-cat="${esc(c)}" type="button">${esc(meta.label)} <span class="n">${counts[c]}</span></button>`;
    });
    D.chipbar.innerHTML = html;
  }

  // Filter & Search Engine
  function apply() {
    const f = activeFilters();
    const q = f.query.toLowerCase().trim();
    const items = active().items;

    let out = items.filter(it => {
      if (q && !it._search.includes(q)) return false;
      if (f.categories.length && !f.categories.some(c => it.categories.includes(c))) return false;
      if (f.region && it.region !== f.region) return false;
      if (f.hasLinks && it.links.length === 0) return false;
      if (f.hasPippo && !it.hasPippo) return false;
      if (f.hasUpdates && !it.categories.includes('update')) return false;
      if (f.hasDlc && !it.categories.includes('dlc')) return false;
      if (f.groupedOnly && !it._grouped) return false;
      return true;
    });

    // Sorting
    if (f.sort === 'name') out.sort((a, b) => a.title.localeCompare(b.title));
    else if (f.sort === 'name-desc') out.sort((a, b) => b.title.localeCompare(a.title));
    else if (f.sort === 'links') out.sort((a, b) => b.links.length - a.links.length);
    else if (f.sort === 'titleid') out.sort((a, b) => (a.titleId || '').localeCompare(b.titleId || ''));

    state.filtered = out;
    render();
  }

  function render() {
    const list = state.filtered;
    D.countPill.innerHTML = `<b>${list.length.toLocaleString()}</b> titles`;

    if (!list.length) {
      D.grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--tx-2);">
        <h3>No matching packages found</h3>
        <p style="margin-top: 8px; font-size: 13px;">Try clearing filters or adjusting your search keyword.</p>
      </div>`;
      return;
    }

    D.grid.innerHTML = list.map((it, idx) => {
      const meta = CATEGORY_META[it.category] || { label: it.category, cls: 'cat-game' };
      const initial = (it.title || '?').charAt(0).toUpperCase();
      let badges = `<span class="badge ${meta.cls}">${esc(meta.label)}</span>`;
      if (it.region) badges += `<span class="badge">${esc(it.region)}</span>`;
      if (it._grouped) badges += `<span class="badge bundle">${it._groupCount} in 1</span>`;
      badges += `<span class="badge links">${it.links.length} mirrors</span>`;

      return `
        <article class="card" data-idx="${idx}">
          <div class="cover">
            <div class="ph">${initial}</div>
            ${it.posterUrl ? `<img class="cover-img" src="${esc(it.posterUrl)}" alt="" loading="lazy">` : ''}
            <div class="badges">${badges}</div>
          </div>
          <div class="meta">
            <h3>${esc(it.title)}</h3>
            <div class="row">
              <span class="tid">${esc(it.titleId || '—')}</span>
              ${it.version ? `<span class="ver">v${esc(it.version)}</span>` : ''}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Detail Modal Inspector
  function openDetail(it) {
    D.mCover.innerHTML = it.posterUrl
      ? `<img src="${esc(it.posterUrl)}" alt="">`
      : (it.title || '?').charAt(0).toUpperCase();

    D.mTitle.textContent = it.title;
    D.mSub.textContent = `${it.titleId || '—'} • ${it.version ? 'v' + it.version : 'Base'}`;

    D.mChips.innerHTML = it.categories.map(c => `
      <span class="m-chip">${(CATEGORY_META[c] || {}).label || c}</span>
    `).join('') + (it.region ? `<span class="m-chip">${it.region}</span>` : '');

    D.mPippoCallout.style.display = it.hasPippo ? 'block' : 'none';

    if (it.downloadSource) {
      D.mSource.href = it.downloadSource;
      D.mSource.style.display = 'inline-flex';
    } else {
      D.mSource.style.display = 'none';
    }

    // Includes section
    if (it._grouped && it._entries.length) {
      D.mIncludesSection.style.display = 'block';
      D.mIncludes.innerHTML = it._entries.map(e => `
        <div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--line); font-size:12px;">
          <span>${(CATEGORY_META[e.category] || {}).label || e.category} ${e.version ? 'v' + e.version : ''}</span>
          <span style="color:var(--tx-3)">${e.size || ''} (${e.linkCount} links)</span>
        </div>
      `).join('');
    } else {
      D.mIncludesSection.style.display = 'none';
    }

    // Specifications
    const specs = [
      { k: 'Title ID', v: it.titleId },
      { k: 'Region', v: it.region },
      { k: 'Firmware', v: it.firmware },
      { k: 'Total Size', v: it._sizeLabel },
      { k: 'Release Note', v: it.note }
    ].filter(s => s.v);

    D.mSpecs.innerHTML = specs.map(s => `
      <div class="spec"><span class="k">${esc(s.k)}</span><span class="v">${esc(s.v)}</span></div>
    `).join('');

    // Links with PS5 Direct Installer Trigger
    D.mLinkCount.textContent = `${it.links.length} mirrors`;
    D.mLinks.innerHTML = it.links.map(l => `
      <div class="link-row">
        <div class="link-main">
          <div class="link-fav">
            <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(l.host)}&sz=64" alt="" onerror="this.remove()">
          </div>
          <div class="link-txt">
            <div class="link-name">${esc(l.name)}</div>
            <div class="link-meta">${esc(l.host)}</div>
          </div>
        </div>
        <div class="link-actions">
          <a class="btn primary sm" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">Open</a>
          <button class="btn ghost sm" type="button" data-copy="${esc(l.url)}">Copy</button>
          <button class="btn ps5-send sm" type="button" data-ps5="${esc(l.url)}" title="Send to PS5 Remote PKG Installer">Direct PS5</button>
        </div>
      </div>
    `).join('');

    D.mCopyAll.onclick = () => {
      const allUrls = it.links.map(l => l.url).join('\n');
      copyText(allUrls, `Copied ${it.links.length} mirrors to clipboard`);
    };

    D.modal.classList.add('open');
  }

  // PS5 Remote PKG Installer API
  async function sendToPs5(pkgUrl) {
    const ip = state.ps5.ip;
    const port = state.ps5.port || '12800';

    if (!ip) {
      toast('Please configure your PS5 IP in settings first', 'err');
      D.ps5Modal.classList.add('open');
      return;
    }

    toast(`Sending to PS5 (${ip}:${port})…`, 'info');

    try {
      const endpoint = `http://${ip}:${port}/api/install`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          packages: [pkgUrl]
        })
      });

      if (res.ok) {
        toast('Command sent! Download started on PS5', 'ok');
      } else {
        toast(`PS5 responded with HTTP ${res.status}`, 'err');
      }
    } catch (err) {
      toast(`Could not reach PS5 at ${ip}:${port} (Check WiFi / etaHEN)`, 'err');
    }
  }

  // Event Wire-up
  function initEvents() {
    // Search input
    let searchDebounce;
    D.search.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        activeFilters().query = e.target.value;
        apply();
      }, 180);
    });

    // Catalog Tabs
    D.catalogTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.cat-tab');
      if (!btn) return;
      const id = btn.getAttribute('data-cat');
      if (id === state.currentCatalogId) return;

      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.currentCatalogId = id;
      localStorage.setItem('opti_catalog', id);

      if (!state.catalogs[id].loaded) {
        loadCatalog(id);
      } else {
        buildStats();
        buildChips();
        apply();
      }
    });

    // Category Chips
    D.chipbar.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;
      const cat = btn.getAttribute('data-cat');
      if (cat === 'all') {
        activeFilters().categories = [];
      } else {
        const cur = activeFilters().categories;
        const idx = cur.indexOf(cat);
        if (idx !== -1) cur.splice(idx, 1);
        else cur.push(cat);
      }
      buildChips();
      apply();
    });

    // Card Click
    D.grid.addEventListener('click', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const idx = Number(card.getAttribute('data-idx'));
      if (state.filtered[idx]) openDetail(state.filtered[idx]);
    });

    // Modal Close
    D.modalClose.onclick = () => D.modal.classList.remove('open');
    D.modal.onclick = (e) => { if (e.target === D.modal) D.modal.classList.remove('open'); };

    // Copy & PS5 triggers inside modal
    D.mLinks.addEventListener('click', (e) => {
      const copyBtn = e.target.closest('[data-copy]');
      if (copyBtn) {
        copyText(copyBtn.getAttribute('data-copy'));
        return;
      }
      const ps5Btn = e.target.closest('[data-ps5]');
      if (ps5Btn) {
        sendToPs5(ps5Btn.getAttribute('data-ps5'));
      }
    });

    // Sync button
    D.ubRefresh.onclick = () => loadCatalog(state.currentCatalogId, true);

    // Passwords Modal
    D.passBtn.onclick = () => {
      D.passPwListDlps.innerHTML = PASSWORDS_ARCHIVE.map(p => `
        <div class="pw-row"><code>${esc(p)}</code> <button class="btn ghost sm" onclick="copyText('${esc(p)}')">Copy</button></div>
      `).join('');
      D.passPwListLocks.innerHTML = PASSWORDS_LOCK.map(p => `
        <div class="pw-row"><code>${esc(p)}</code> <button class="btn ghost sm" onclick="copyText('${esc(p)}')">Copy</button></div>
      `).join('');
      D.passModal.classList.add('open');
    };

    // PS5 Settings Modal
    D.ps5ConfigBtn.onclick = () => {
      D.ps5IpInput.value = state.ps5.ip;
      D.ps5PortInput.value = state.ps5.port;
      D.ps5Modal.classList.add('open');
    };

    D.savePs5Config.onclick = () => {
      state.ps5.ip = D.ps5IpInput.value.trim();
      state.ps5.port = D.ps5PortInput.value.trim() || '12800';
      localStorage.setItem('ps5_ip', state.ps5.ip);
      localStorage.setItem('ps5_port', state.ps5.port);
      D.ps5Modal.classList.remove('open');
      toast('PS5 IP address saved', 'ok');
    };

    D.testPs5Ping.onclick = async () => {
      const ip = D.ps5IpInput.value.trim();
      const port = D.ps5PortInput.value.trim() || '12800';
      if (!ip) { toast('Enter an IP address first', 'err'); return; }
      toast(`Pinging http://${ip}:${port}…`, 'info');
      try {
        await fetch(`http://${ip}:${port}/`, { mode: 'no-cors' });
        toast('PS5 endpoint reached!', 'ok');
      } catch (err) {
        toast('Connection failed (Verify PS5 is on same network)', 'err');
      }
    };

    // Close overlays with data-close
    document.querySelectorAll('[data-close]').forEach(b => {
      b.onclick = () => $(b.getAttribute('data-close')).classList.remove('open');
    });

    // Drag and Drop custom JSON
    window.addEventListener('dragover', (e) => { e.preventDefault(); D.dropOverlay.classList.add('active'); });
    window.addEventListener('dragleave', (e) => { if (e.clientX <= 0 || e.clientY <= 0) D.dropOverlay.classList.remove('active'); });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      D.dropOverlay.classList.remove('active');
      const file = e.dataTransfer.files[0];
      if (!file || !file.name.endsWith('.json')) {
        toast('Please drop a valid .json file', 'err');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const normalized = normalize(parsed);
          state.catalogs[state.currentCatalogId].items = normalized;
          buildStats();
          buildChips();
          apply();
          toast(`Loaded custom file: ${file.name} (${normalized.length} titles)`, 'ok');
        } catch (err) {
          toast('Invalid JSON syntax in dropped file', 'err');
        }
      };
      reader.readAsText(file);
    });
  }

  // Initialization
  cacheDom();
  initEvents();
  loadCatalog(state.currentCatalogId);

  // Register PWA Service Worker if available
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
