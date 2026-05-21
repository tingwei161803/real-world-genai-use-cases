/* Real-World Gen AI Use Cases — interactivity
   i18n · dual-axis filter · search · progressive render · detail dialog
   sources · theme · ripple · deep links */
(() => {
  'use strict';

  const DATA = (window.USE_CASES || []).map((d, i) => ({ ...d, n: i + 1 }));
  const INDUSTRIES = window.INDUSTRIES || [];
  const AGENT_TYPES = window.AGENT_TYPES || [];
  const BATCH = 60;
  const GCP_ARTICLE = 'https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders';

  const indLabel = (k, lang) => (INDUSTRIES.find((x) => x.key === k) || {})[lang] || k;
  const agLabel = (k, lang) => (AGENT_TYPES.find((x) => x.key === k) || {})[lang] || k;
  const indIcon = (k) => (INDUSTRIES.find((x) => x.key === k) || {}).icon || 'label';

  const I18N = {
    zh: {
      brand: 'Gen AI 真實應用圖鑑', brandSub: '取材自 Google Cloud',
      eyebrow: '取材自 Google Cloud 官方文章',
      heroTitle: '全世界都在用 <span class="grad">Gen AI</span> 做的事',
      heroDesc: '把 Google Cloud 整理的數百家領先企業真實 Gen AI 應用，做成一份可互動、可雙維度篩選、可搜尋的中英對照圖鑑。每筆都經查證並附上資料來源。',
      statCases: '應用案例', statInds: '產業領域', statAgents: 'Agent 類型',
      footer: '內容整理自 <a href="https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" target="_blank" rel="noopener">Google Cloud — Real-world gen AI use cases</a>。本頁為非官方的中英對照學習用整理，各案例均附原始資料來源。',
      searchPlaceholder: '搜尋公司、應用、技術或關鍵字…',
      filterIndustry: '產業', filterAgent: 'Agent 類型', all: '全部',
      cardCta: '查看細節', badgeNew: '新',
      secOverview: '應用概述', secHighlights: '重點與成效', secTech: '使用技術', secSources: '資料來源',
      original: '看 Google 原文', prev: '上一個', next: '下一個',
      emptyTitle: '找不到符合的案例', emptyDesc: '換個關鍵字，或清除篩選條件試試。',
      results: (n) => `${n} 個案例`,
      themeDark: '切換深色', themeLight: '切換淺色',
    },
    en: {
      brand: 'Real-World Gen AI Use Cases', brandSub: 'Sourced from Google Cloud',
      eyebrow: 'Sourced from a Google Cloud article',
      heroTitle: 'What the whole world is doing with <span class="grad">Gen AI</span>',
      heroDesc: "Hundreds of leading organizations' real-world generative AI applications, curated by Google Cloud into one interactive, dual-filterable, searchable bilingual gallery. Every entry is researched and cited.",
      statCases: 'Use cases', statInds: 'Industries', statAgents: 'Agent types',
      footer: 'Content adapted from <a href="https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders" target="_blank" rel="noopener">Google Cloud — Real-world gen AI use cases</a>. An unofficial bilingual study companion; each entry links its original source.',
      searchPlaceholder: 'Search companies, applications, tech or keywords…',
      filterIndustry: 'Industry', filterAgent: 'Agent type', all: 'All',
      cardCta: 'View details', badgeNew: 'New',
      secOverview: 'Overview', secHighlights: 'Highlights & outcomes', secTech: 'Technologies', secSources: 'Sources',
      original: 'Read on Google Cloud', prev: 'Previous', next: 'Next',
      emptyTitle: 'No matching use cases', emptyDesc: 'Try a different keyword or clear the filters.',
      results: (n) => `${n} use case${n === 1 ? '' : 's'}`,
      themeDark: 'Switch to dark', themeLight: 'Switch to light',
    },
  };

  const state = {
    lang: localStorage.getItem('genai.lang') || 'zh',
    theme: localStorage.getItem('genai.theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    industry: 'all',
    agent: 'all',
    q: '',
  };
  let filtered = DATA.slice();
  let shown = 0;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const t = (k) => I18N[state.lang][k];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function attachRipple(el) {
    el.addEventListener('pointerdown', (e) => {
      const r = el.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      el.appendChild(span);
      span.addEventListener('animationend', () => span.remove());
    });
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const dark = state.theme === 'dark';
    $('#theme-icon').textContent = dark ? 'light_mode' : 'dark_mode';
    $('#theme-toggle').title = dark ? t('themeLight') : t('themeDark');
  }
  $('#theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('genai.theme', state.theme);
    applyTheme();
  });

  function applyStaticI18n() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-Hant' : 'en';
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    $('#search').placeholder = t('searchPlaceholder');
    $('#lang-zh').setAttribute('aria-pressed', String(state.lang === 'zh'));
    $('#lang-en').setAttribute('aria-pressed', String(state.lang === 'en'));
    applyTheme();
  }
  function setLang(lang) {
    if (lang === state.lang) return;
    state.lang = lang;
    localStorage.setItem('genai.lang', lang);
    applyStaticI18n();
    renderChips();
    renderCards();
    if (openIndex >= 0) renderDialog();
  }
  $('#lang-zh').addEventListener('click', () => setLang('zh'));
  $('#lang-en').addEventListener('click', () => setLang('en'));

  /* chips：兩排（產業 + agent），交集篩選 */
  function fillChips(wrap, items, active, onPick) {
    wrap.innerHTML = items.map((it) => `
      <button class="chip ripple-host" data-key="${it.key}" aria-pressed="${active === it.key}"
        ${it.accent ? `style="--cat:var(--c-${esc(it.accent)})"` : ''}>
        <span class="leadcheck"><span class="material-symbols-rounded">check</span></span>
        <span class="material-symbols-rounded" style="font-size:18px">${esc(it.icon)}</span>
        ${esc(it.label)} <span class="count">${it.count}</span>
      </button>`).join('');
    $$('.chip', wrap).forEach((b) => {
      attachRipple(b);
      b.addEventListener('click', () => onPick(b.dataset.key));
    });
  }
  function renderChips() {
    // 計數同時受對向篩選與目前搜尋字串約束，避免顯示與點擊後結果不一致。
    const indCount = (k) => DATA.filter((d) => d.industry === k && (state.agent === 'all' || d.agentType === state.agent) && matches(d, state.q)).length;
    const indAll = DATA.filter((d) => (state.agent === 'all' || d.agentType === state.agent) && matches(d, state.q)).length;
    const indItems = [{ key: 'all', label: t('all'), count: indAll, icon: 'apps' }]
      .concat(INDUSTRIES.map((c) => ({ key: c.key, label: c[state.lang], count: indCount(c.key), icon: c.icon })));
    fillChips($('#chips-industry'), indItems, state.industry, (key) => { state.industry = key; renderChips(); renderCards(); });

    const agCount = (k) => DATA.filter((d) => d.agentType === k && (state.industry === 'all' || d.industry === state.industry) && matches(d, state.q)).length;
    const agAll = DATA.filter((d) => (state.industry === 'all' || d.industry === state.industry) && matches(d, state.q)).length;
    const agItems = [{ key: 'all', label: t('all'), count: agAll, icon: 'apps' }]
      .concat(AGENT_TYPES.map((c) => ({ key: c.key, label: c[state.lang], count: agCount(c.key), icon: c.icon, accent: c.key })));
    fillChips($('#chips-agent'), agItems, state.agent, (key) => { state.agent = key; renderChips(); renderCards(); });
  }

  /* filtering */
  function matches(d, q) {
    if (!q) return true;
    const hay = [
      d.company, d.summary.en, d.summary.zh, d.overview.en, d.overview.zh,
      (d.technologies || []).join(' '), indLabel(d.industry, 'en'), indLabel(d.industry, 'zh'),
      agLabel(d.agentType, 'en'), agLabel(d.agentType, 'zh'),
    ].join(' ').toLowerCase();
    return q.toLowerCase().split(/\s+/).every((term) => hay.includes(term));
  }
  function computeFiltered() {
    filtered = DATA.filter((d) =>
      (state.industry === 'all' || d.industry === state.industry) &&
      (state.agent === 'all' || d.agentType === state.agent) &&
      matches(d, state.q));
  }

  function cardHTML(d, i) {
    const lang = state.lang;
    const tags = (d.technologies || []).slice(0, 3).map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    return `
      <button class="card" data-id="${esc(d.id)}" style="--cat:var(--c-${esc(d.agentType)}); animation-delay:${Math.min(i, 12) * 28}ms">
        <div class="card__top">
          <span class="cat-pill"><span class="ic"></span>${esc(agLabel(d.agentType, lang))}</span>
          ${d.isNew ? `<span class="badge-new">${t('badgeNew')}</span>` : `<span class="card__num">#${String(d.n).padStart(3, '0')}</span>`}
        </div>
        <span class="ind-line"><span class="material-symbols-rounded" style="font-size:15px">${esc(indIcon(d.industry))}</span>${esc(indLabel(d.industry, lang))}</span>
        <h3>${esc(d.company)}</h3>
        <p>${esc(d.summary[lang])}</p>
        <div class="card__tags">${tags}</div>
        <span class="card__cta">${t('cardCta')}<span class="material-symbols-rounded">arrow_forward</span></span>
      </button>`;
  }

  function renderCards() {
    computeFiltered();
    shown = 0;
    const grid = $('#grid');
    $('#result-count').textContent = t('results')(filtered.length);
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty">
        <span class="material-symbols-rounded">search_off</span>
        <h3>${t('emptyTitle')}</h3><p>${t('emptyDesc')}</p></div>`;
      $('#load-sentinel').hidden = true;
      return;
    }
    grid.innerHTML = '';
    appendBatch();
  }
  function appendBatch() {
    const grid = $('#grid');
    const slice = filtered.slice(shown, shown + BATCH);
    const frag = document.createElement('div');
    frag.innerHTML = slice.map((d, i) => cardHTML(d, shown + i)).join('');
    Array.from(frag.children).forEach((c) => {
      c.addEventListener('click', () => openDialog(filtered.findIndex((d) => d.id === c.dataset.id)));
      grid.appendChild(c);
    });
    shown += slice.length;
    $('#load-sentinel').hidden = shown >= filtered.length;
  }

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && shown < filtered.length) appendBatch();
  }, { rootMargin: '600px' });
  io.observe($('#load-sentinel'));

  /* search */
  const searchEl = $('#search');
  const clearEl = $('#search-clear');
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearEl.classList.toggle('show', !!searchEl.value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchEl.value.trim(); renderChips(); renderCards(); }, 120);
  });
  clearEl.addEventListener('click', () => {
    searchEl.value = ''; state.q = ''; clearEl.classList.remove('show'); renderChips(); renderCards(); searchEl.focus();
  });

  /* dialog */
  const scrim = $('#scrim');
  const dialog = $('#dialog');
  let openIndex = -1;
  let lastFocus = null;

  function listItems(arr) { return (arr || []).map((x) => `<li>${esc(x)}</li>`).join(''); }
  function sourceItems(arr) {
    return (arr || []).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">
      <span class="material-symbols-rounded">link</span>${esc(s.title || s.url)}</a></li>`).join('');
  }

  function renderDialog() {
    const d = filtered[openIndex];
    if (!d) return;
    const lang = state.lang;
    const hl = (d.highlights && d.highlights[lang]) || [];
    const tech = (d.technologies || []).map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    dialog.innerHTML = `
      <div class="dialog__head" style="--cat:var(--c-${esc(d.agentType)})">
        <div class="dialog__title">
          <span class="cat-pill"><span class="ic"></span>${esc(agLabel(d.agentType, lang))}</span>
          <span class="ind-line"><span class="material-symbols-rounded" style="font-size:15px">${esc(indIcon(d.industry))}</span>${esc(indLabel(d.industry, lang))}</span>
          <h2 id="dlg-title">${esc(d.company)}${d.isNew ? ` <span class="badge-new">${t('badgeNew')}</span>` : ''}</h2>
        </div>
        <button class="icon-btn ripple-host dialog__close" id="dlg-close" aria-label="Close">
          <span class="material-symbols-rounded">close</span>
        </button>
      </div>
      <div class="dialog__body">
        <section>
          <h4><span class="material-symbols-rounded">info</span>${t('secOverview')}</h4>
          <p class="lead">${esc(d.overview[lang])}</p>
        </section>
        ${hl.length ? `<section>
          <h4><span class="material-symbols-rounded">trophy</span>${t('secHighlights')}</h4>
          <ul>${listItems(hl)}</ul>
        </section>` : ''}
        ${tech ? `<section>
          <h4><span class="material-symbols-rounded">build</span>${t('secTech')}</h4>
          <div class="tech-tags">${tech}</div>
        </section>` : ''}
        <section>
          <h4><span class="material-symbols-rounded">menu_book</span>${t('secSources')}</h4>
          <ul class="sources">${sourceItems(d.sources)}</ul>
        </section>
        <div class="dialog__foot">
          <a class="btn-filled ripple-host" href="${esc(GCP_ARTICLE)}" target="_blank" rel="noopener">
            <span class="material-symbols-rounded">open_in_new</span>${t('original')}
          </a>
          <div class="dialog__nav">
            <button class="btn-text ripple-host" id="dlg-prev"><span class="material-symbols-rounded">arrow_back</span>${t('prev')}</button>
            <button class="btn-text ripple-host" id="dlg-next">${t('next')}<span class="material-symbols-rounded">arrow_forward</span></button>
          </div>
        </div>
      </div>`;
    $$('.ripple-host', dialog).forEach(attachRipple);
    $('#dlg-close').addEventListener('click', closeDialog);
    $('#dlg-prev').addEventListener('click', () => openDialog((openIndex - 1 + filtered.length) % filtered.length));
    $('#dlg-next').addEventListener('click', () => openDialog((openIndex + 1) % filtered.length));
    dialog.scrollTop = 0;
  }

  function openDialog(index) {
    if (index < 0 || index >= filtered.length) return;
    const firstOpen = openIndex < 0;
    openIndex = index;
    renderDialog();
    history.replaceState(null, '', '#' + filtered[openIndex].id);
    if (firstOpen) {
      lastFocus = document.activeElement;
      scrim.hidden = false;
      requestAnimationFrame(() => scrim.classList.add('open'));
      document.body.style.overflow = 'hidden';
    }
    $('#dlg-close').focus();
  }
  function closeDialog() {
    if (openIndex < 0) return;
    openIndex = -1;
    scrim.classList.remove('open');
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { scrim.hidden = true; }, 280);
    if (lastFocus) lastFocus.focus();
  }
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeDialog(); });
  document.addEventListener('keydown', (e) => {
    if (openIndex < 0) return;
    if (e.key === 'Escape') { closeDialog(); return; }
    if (e.key === 'Tab') {
      // Focus trap：把 Tab/Shift+Tab 鎖在對話框內的可聚焦元素之間。
      const f = $$('a[href], button:not([disabled])', dialog);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialog.contains(active))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault(); first.focus();
      }
      return;
    }
    if (e.key === 'ArrowLeft') openDialog((openIndex - 1 + filtered.length) % filtered.length);
    else if (e.key === 'ArrowRight') openDialog((openIndex + 1) % filtered.length);
  });

  /* init */
  $$('.ripple-host').forEach(attachRipple);
  fetch('https://api.github.com/repos/tingwei161803/real-world-genai-use-cases')
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || typeof j.stargazers_count !== 'number') return;
      const el = $('#gh-count');
      el.textContent = j.stargazers_count >= 1000 ? (j.stargazers_count / 1000).toFixed(1) + 'k' : j.stargazers_count;
      el.hidden = false;
    })
    .catch(() => {});

  $('#stat-total').textContent = DATA.length;
  $('#stat-inds').textContent = INDUSTRIES.length;
  $('#stat-agents').textContent = AGENT_TYPES.length;
  applyStaticI18n();
  renderChips();
  renderCards();

  function openFromHash() {
    let id;
    try {
      id = decodeURIComponent(location.hash.replace('#', ''));
    } catch (_) {
      return; // 畸形的 hash（無效 %-序列）忽略，避免整頁互動因 URIError 中斷
    }
    if (!id) { if (openIndex >= 0) closeDialog(); return; }
    if (openIndex >= 0 && filtered[openIndex] && filtered[openIndex].id === id) return;
    const idx = filtered.findIndex((d) => d.id === id);
    if (idx >= 0) openDialog(idx);
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
