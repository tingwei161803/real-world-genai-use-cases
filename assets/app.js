/* Real-World Gen AI Use Cases — interactivity
   industry × agent matrix filter · search · progressive render · detail dialog
   filter sheet · grid/list view · theme · deep links */
(() => {
  'use strict';

  const DATA = (window.USE_CASES || []).map((d, i) => ({ ...d, n: i + 1 }));
  const INDUSTRIES = window.INDUSTRIES || [];
  const AGENT_TYPES = window.AGENT_TYPES || [];
  const BATCH = 48;
  const GCP_ARTICLE = 'https://cloud.google.com/transform/101-real-world-generative-ai-use-cases-from-industry-leaders';
  const STARS_API = 'https://img.shields.io/github/stars/tingwei161803/real-world-genai-use-cases.json';

  // 矩陣與章節標題用的短標籤（完整名稱放在 title / aria-label）
  const SHORT = {
    industry: {
      en: {
        'automotive-logistics': 'Auto & logistics',
        'business-professional-services': 'Business services',
        'financial-services': 'Financial',
        'healthcare-life-sciences': 'Healthcare',
        'hospitality-travel': 'Hospitality',
        'manufacturing-industrial-electronics': 'Manufacturing',
        'media-marketing-gaming': 'Media & gaming',
        'public-sector-nonprofits': 'Public sector',
        retail: 'Retail',
        technology: 'Technology',
        telecommunications: 'Telecom',
      },
    },
    agent: {
      zh: { customer: '顧客', employee: '員工', creative: '創意', code: '程式', data: '資料', security: '資安' },
      en: { customer: 'Cust.', employee: 'Empl.', creative: 'Creat.', code: 'Code', data: 'Data', security: 'Sec.' },
    },
  };

  const indLabel = (k, lang) => (INDUSTRIES.find((x) => x.key === k) || {})[lang] || k;
  const agLabel = (k, lang) => (AGENT_TYPES.find((x) => x.key === k) || {})[lang] || k;
  const indShort = (k, lang) => (SHORT.industry[lang] && SHORT.industry[lang][k]) || indLabel(k, lang);
  const agShort = (k, lang) => (SHORT.agent[lang] && SHORT.agent[lang][k]) || agLabel(k, lang);

  const I18N = {
    zh: {
      countLine: (i, a) => ['個真實案例', `分屬 ${i} 個產業、${a} 種 Agent 類型`],
      all: '全部',
      searchPlaceholder: '搜尋公司、應用、技術或關鍵字…',
      clearAll: '清除篩選', showN: (n) => `顯示 ${n.toLocaleString('en-US')} 個案例`,
      removeFilter: (s) => `移除篩選：${s}`,
      cellLabel: (ind, ag, n) => `${ind} × ${ag}：${n} 個案例`,
      rowLabel: (ind, n) => `${ind}：${n} 個案例`,
      badgeNew: '新收錄',
      secOverview: '應用概述', secHighlights: '重點與成效', secTech: '使用技術', secSources: '資料來源',
      original: '看 Google 原文', prev: '上一個', next: '下一個', close: '關閉',
      emptyTitle: '找不到符合的案例', emptyDesc: '換個關鍵字，或清除搜尋與篩選再試一次。', emptyReset: '清除搜尋與篩選',
      results: (n) => `${n.toLocaleString('en-US')} 個案例`,
      chapterCount: (n) => `${n} 個`,
      themeDark: '切換深色', themeLight: '切換淺色',
      singleSrc: '單一來源', singleSrcNote: '此案例目前僅引用 Google 官方文章，尚未找到第三方佐證；內容忠於原文、未經獨立查證。',
      techSep: '、',
    },
    en: {
      countLine: (i, a) => ['real-world use cases', `across ${i} industries and ${a} agent types`],
      all: 'All',
      searchPlaceholder: 'Search companies, applications, tech or keywords…',
      clearAll: 'Clear filters', showN: (n) => `Show ${n.toLocaleString('en-US')} use case${n === 1 ? '' : 's'}`,
      removeFilter: (s) => `Remove filter: ${s}`,
      cellLabel: (ind, ag, n) => `${ind} × ${ag}: ${n} use case${n === 1 ? '' : 's'}`,
      rowLabel: (ind, n) => `${ind}: ${n} use case${n === 1 ? '' : 's'}`,
      badgeNew: 'New',
      secOverview: 'Overview', secHighlights: 'Highlights & outcomes', secTech: 'Technologies', secSources: 'Sources',
      original: 'Read on Google Cloud', prev: 'Previous', next: 'Next', close: 'Close',
      emptyTitle: 'No matching use cases', emptyDesc: 'Try a different keyword, or clear the search and filters.', emptyReset: 'Clear search and filters',
      results: (n) => `${n.toLocaleString('en-US')} use case${n === 1 ? '' : 's'}`,
      chapterCount: (n) => String(n),
      themeDark: 'Switch to dark', themeLight: 'Switch to light',
      singleSrc: 'Single source', singleSrcNote: 'This entry currently cites only the Google article; no third-party source found yet. Content is faithful to the original but not independently verified.',
      techSep: ', ',
    },
  };

  // 語言由網址決定：每個語言有自己的頁面，頁面用 <html lang> 宣告自己是哪一種。
  // 不從 localStorage 讀回來——走到 /en/ 的訪客就該看到英文，即使他上次選過中文；
  // 而爬蟲根本沒有 localStorage。
  const pageLang = (document.documentElement.getAttribute('lang') || 'en')
    .toLowerCase().startsWith('zh') ? 'zh' : 'en';

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* 私密模式等情況忽略 */ } },
  };

  const state = {
    lang: pageLang,
    theme: store.get('genai.theme') ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
    view: store.get('genai.view') === 'list' ? 'list' : 'grid',
    industry: 'all',
    agent: 'all',
    q: '',
  };
  let filtered = DATA;
  let shown = 0;
  let lastChapter = null;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const t = (k) => I18N[state.lang][k];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n) => n.toLocaleString('en-US');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- search haystack（只建一次，避免每次輸入都重組 1,276 筆字串） ---------- */
  DATA.forEach((d) => {
    d.hay = [
      d.company, d.summary.en, d.summary.zh, d.overview.en, d.overview.zh,
      (d.technologies || []).join(' '), indLabel(d.industry, 'en'), indLabel(d.industry, 'zh'),
      agLabel(d.agentType, 'en'), agLabel(d.agentType, 'zh'),
    ].join(' ').toLowerCase();
  });
  function matches(d, terms) { return terms.every((term) => d.hay.includes(term)); }
  const queryTerms = () => (state.q ? state.q.toLowerCase().split(/\s+/).filter(Boolean) : []);

  /* ---------- theme ---------- */
  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const dark = state.theme === 'dark';
    $('#theme-icon').textContent = dark ? 'light_mode' : 'dark_mode';
    $('#theme-toggle').title = dark ? t('themeLight') : t('themeDark');
  }
  $('#theme-toggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    store.set('genai.theme', state.theme);
    applyTheme();
  });

  /* ---------- matrix（產業 × agent 類型，同時是篩選器） ---------- */
  function countMatrix() {
    const terms = queryTerms();
    const m = {};
    INDUSTRIES.forEach((i) => { m[i.key] = {}; AGENT_TYPES.forEach((a) => { m[i.key][a.key] = 0; }); });
    let total = 0;
    for (const d of DATA) {
      if (terms.length && !matches(d, terms)) continue;
      m[d.industry][d.agentType] += 1;
      total += 1;
    }
    return { m, total };
  }

  function matrixHTML(counts) {
    const lang = state.lang;
    const { m, total } = counts;
    let max = 1;
    const colTot = {};
    AGENT_TYPES.forEach((a) => { colTot[a.key] = 0; });
    INDUSTRIES.forEach((i) => AGENT_TYPES.forEach((a) => {
      max = Math.max(max, m[i.key][a.key]);
      colTot[a.key] += m[i.key][a.key];
    }));
    const selAll = state.industry === 'all' && state.agent === 'all';
    const head = AGENT_TYPES.map((a) => {
      const on = state.agent === a.key && state.industry === 'all';
      return `<th scope="col"><button type="button" class="mx-col" data-ag="${a.key}" aria-pressed="${on}" title="${esc(a[lang])}" aria-label="${esc(t('rowLabel')(a[lang], colTot[a.key]))}"><i class="sw" data-a="${a.key}"></i><span class="lbl-full">${esc(a[lang])}</span><span class="lbl-short">${esc(agShort(a.key, lang))}</span><b>${colTot[a.key]}</b></button></th>`;
    }).join('');
    const rows = INDUSTRIES.map((ind) => {
      const rowTot = AGENT_TYPES.reduce((s, a) => s + m[ind.key][a.key], 0);
      const rowOn = state.industry === ind.key && state.agent === 'all';
      const cells = AGENT_TYPES.map((a) => {
        const n = m[ind.key][a.key];
        const inSel = (state.industry === 'all' || state.industry === ind.key) &&
          (state.agent === 'all' || state.agent === a.key);
        const exact = state.industry === ind.key && state.agent === a.key;
        if (!n) return `<td><span class="mx-cell is-zero${inSel ? '' : ' dim'}" aria-hidden="true">·</span></td>`;
        const h = Math.sqrt(n / max);
        return `<td><button type="button" class="mx-cell${h > 0.62 ? ' hot' : ''}${inSel ? '' : ' dim'}" data-ind="${ind.key}" data-ag="${a.key}" data-a="${a.key}" style="--h:${(0.08 + h * 0.86).toFixed(3)}" aria-pressed="${exact}" aria-label="${esc(t('cellLabel')(ind[lang], a[lang], n))}">${n}</button></td>`;
      }).join('');
      return `<tr${state.industry === ind.key ? ' class="row-on"' : ''}><th scope="row"><button type="button" class="mx-row" data-ind="${ind.key}" aria-pressed="${rowOn}" title="${esc(ind[lang])}" aria-label="${esc(t('rowLabel')(ind[lang], rowTot))}"><span class="lbl-full">${esc(ind[lang])}</span><span class="lbl-short">${esc(indShort(ind.key, lang))}</span><b>${rowTot}</b></button></th>${cells}</tr>`;
    }).join('');
    return `<table class="mx${selAll ? '' : ' has-sel'}"><thead><tr><th scope="col" class="mx-corner"><button type="button" class="mx-all" data-all="1" aria-pressed="${selAll}"><span>${t('all')}</span><b>${fmt(total)}</b></button></th>${head}</tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderMatrices() {
    const counts = countMatrix();
    const html = matrixHTML(counts);
    ['#matrix', '#matrix-sheet'].forEach((sel) => {
      const host = $(sel);
      if (!host) return;
      // 重繪後把焦點放回同一顆按鈕（鍵盤操作不會被打斷）
      const a = document.activeElement;
      let key = null;
      if (a && host.contains(a)) key = { ind: a.dataset.ind, ag: a.dataset.ag, all: a.dataset.all };
      host.innerHTML = html;
      if (key) {
        const q = key.all ? '[data-all]' :
          key.ind && key.ag ? `[data-ind="${key.ind}"][data-ag="${key.ag}"]` :
            key.ind ? `.mx-row[data-ind="${key.ind}"]` : `.mx-col[data-ag="${key.ag}"]`;
        const b = $(q, host);
        if (b) b.focus({ preventScroll: true });
      }
    });
  }

  function pick(btn) {
    const ind = btn.dataset.ind;
    const ag = btn.dataset.ag;
    if (btn.dataset.all) { state.industry = 'all'; state.agent = 'all'; }
    else if (ind && ag) {
      const same = state.industry === ind && state.agent === ag;
      state.industry = same ? 'all' : ind;
      state.agent = same ? 'all' : ag;
    } else if (ind) {
      const same = state.industry === ind && state.agent === 'all';
      state.industry = same ? 'all' : ind; state.agent = 'all';
    } else if (ag) {
      const same = state.agent === ag && state.industry === 'all';
      state.agent = same ? 'all' : ag; state.industry = 'all';
    }
    update();
  }

  function scrollToResults() {
    // #results 有 scroll-margin-top，捲動後不會被黏在頂端的搜尋列蓋住
    $('#results').scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.mx button');
    if (!btn) return;
    const inHero = !!btn.closest('#matrix');
    pick(btn);
    if (inHero) scrollToResults();
  });

  /* ---------- filtering + results ---------- */
  function computeFiltered() {
    const terms = queryTerms();
    filtered = DATA.filter((d) =>
      (state.industry === 'all' || d.industry === state.industry) &&
      (state.agent === 'all' || d.agentType === state.agent) &&
      (!terms.length || matches(d, terms)));
  }

  function plateHTML(d) {
    const lang = state.lang;
    const tech = (d.technologies || []).slice(0, 3).map(esc).join(t('techSep'));
    const flags = [
      d.isNew ? `<span class="flag flag--new">${t('badgeNew')}</span>` : '',
      d.needsReview ? `<span class="flag" title="${esc(t('singleSrcNote'))}">${t('singleSrc')}</span>` : '',
    ].join('');
    return `<a class="plate" href="#${esc(d.id)}" data-id="${esc(d.id)}" data-a="${d.agentType}"><span class="plate__no">No.${String(d.n).padStart(4, '0')}</span><span class="plate__ag">${esc(agLabel(d.agentType, lang))}</span><h3>${esc(d.company)}</h3><p>${esc(d.summary[lang])}</p><span class="plate__foot"><span class="plate__tech">${tech}</span>${flags}</span></a>`;
  }

  function chapterHTML(indKey, perInd) {
    const lang = state.lang;
    const agCounts = perInd[indKey].ag;
    const tot = perInd[indKey].n;
    const bar = AGENT_TYPES.filter((a) => agCounts[a.key])
      .map((a) => `<i data-a="${a.key}" style="flex:${agCounts[a.key]}" title="${esc(a[lang])} ${agCounts[a.key]}"></i>`).join('');
    return `<h2 class="chapter" data-ind="${indKey}"><span class="chapter__name">${esc(indLabel(indKey, lang))}</span><span class="chapter__n">${t('chapterCount')(tot)}</span><span class="chapter__bar" aria-hidden="true">${bar}</span></h2>`;
  }

  let perInd = {};
  function tallyChapters() {
    perInd = {};
    for (const d of filtered) {
      const p = perInd[d.industry] || (perInd[d.industry] = { n: 0, ag: {} });
      p.n += 1;
      p.ag[d.agentType] = (p.ag[d.agentType] || 0) + 1;
    }
  }

  const sigOf = () => [state.lang, DATA.length, DATA.length ? DATA[DATA.length - 1].id : '', state.industry, state.agent, state.q].join('|');

  function renderActive() {
    const wrap = $('#active-filters');
    const lang = state.lang;
    const tokens = [];
    if (state.industry !== 'all') tokens.push({ k: 'industry', label: indLabel(state.industry, lang) });
    if (state.agent !== 'all') tokens.push({ k: 'agent', label: agLabel(state.agent, lang), a: state.agent });
    wrap.innerHTML = tokens.map((tk) => `<button type="button" class="token" data-clear="${tk.k}"${tk.a ? ` data-a="${tk.a}"` : ''} aria-label="${esc(t('removeFilter')(tk.label))}">${tk.a ? '<i class="sw"></i>' : ''}${esc(tk.label)}<span class="material-symbols-rounded" aria-hidden="true">close</span></button>`).join('');
    const n = tokens.length;
    const badge = $('#filter-n');
    badge.textContent = n;
    badge.hidden = !n;
    $('#filter-open').classList.toggle('is-on', n > 0);
  }
  $('#active-filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-clear]');
    if (!b) return;
    state[b.dataset.clear] = 'all';
    update();
  });

  function renderCards() {
    computeFiltered();
    tallyChapters();
    shown = 0;
    lastChapter = null;
    const grid = $('#grid');
    grid.dataset.sig = sigOf();
    $('#result-count').textContent = t('results')(filtered.length);
    $('#sheet-apply').textContent = t('showN')(filtered.length);
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty">
        <span class="material-symbols-rounded" aria-hidden="true">search_off</span>
        <h3>${t('emptyTitle')}</h3><p>${t('emptyDesc')}</p>
        <button type="button" class="btn-line" id="empty-reset">${t('emptyReset')}</button></div>`;
      $('#empty-reset').addEventListener('click', resetAll);
      $('#load-sentinel').hidden = true;
      return;
    }
    grid.innerHTML = '';
    appendBatch();
  }

  function appendBatch() {
    const grid = $('#grid');
    const slice = filtered.slice(shown, shown + BATCH);
    let html = '';
    for (const d of slice) {
      if (d.industry !== lastChapter) { html += chapterHTML(d.industry, perInd); lastChapter = d.industry; }
      html += plateHTML(d);
    }
    grid.insertAdjacentHTML('beforeend', html);
    shown += slice.length;
    $('#load-sentinel').hidden = shown >= filtered.length;
  }

  // 卡片點擊用事件委派：1,276 張卡不必各掛一個 listener，預先寫進 HTML 的卡片也直接可用。
  $('#grid').addEventListener('click', (e) => {
    const card = e.target.closest('.plate');
    if (!card || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    openDialog(filtered.findIndex((d) => d.id === card.dataset.id));
  });

  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && shown < filtered.length) appendBatch();
  }, { rootMargin: '900px' });
  io.observe($('#load-sentinel'));

  function update() {
    renderMatrices();
    renderActive();
    renderCards();
  }
  function resetAll() {
    state.industry = 'all'; state.agent = 'all'; state.q = '';
    searchEl.value = ''; clearEl.classList.remove('show');
    update();
  }

  /* ---------- view toggle ---------- */
  function applyView() {
    $('#grid').dataset.view = state.view;
    $$('.view-toggle button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === state.view)));
  }
  $$('.view-toggle button').forEach((b) => b.addEventListener('click', () => {
    state.view = b.dataset.view;
    store.set('genai.view', state.view);
    applyView();
  }));

  /* ---------- search ---------- */
  const searchEl = $('#search');
  const clearEl = $('#search-clear');
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearEl.classList.toggle('show', !!searchEl.value);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.q = searchEl.value.trim(); update(); }, 140);
  });
  searchEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); searchEl.blur(); scrollToResults(); }
  });
  clearEl.addEventListener('click', () => {
    searchEl.value = ''; state.q = ''; clearEl.classList.remove('show'); update(); searchEl.focus();
  });

  /* ---------- filter sheet（手機為底部抽屜，桌機為下拉面板） ---------- */
  const sheet = $('#sheet');
  let sheetReturn = null;
  function openSheet() {
    sheetReturn = document.activeElement;
    renderMatrices();
    sheet.hidden = false;
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => sheet.classList.add('open'));
    $('#sheet-close').focus();
  }
  function closeSheet(goToResults) {
    if (sheet.hidden) return;
    sheet.classList.remove('open');
    document.body.classList.remove('is-locked');
    setTimeout(() => { sheet.hidden = true; }, reduceMotion ? 0 : 240);
    if (goToResults) scrollToResults();
    if (sheetReturn && !goToResults) sheetReturn.focus();
  }
  $('#filter-open').addEventListener('click', openSheet);
  $('#sheet-close').addEventListener('click', () => closeSheet(false));
  $('#sheet-apply').addEventListener('click', () => closeSheet(true));
  $('#sheet-clear').addEventListener('click', () => { state.industry = 'all'; state.agent = 'all'; update(); });
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(false); });

  /* ---------- dialog ---------- */
  const scrim = $('#scrim');
  const dialog = $('#dialog');
  let openIndex = -1;
  let lastFocus = null;

  function listItems(arr) { return (arr || []).map((x) => `<li>${esc(x)}</li>`).join(''); }
  function sourceItems(arr) {
    return (arr || []).map((s) => {
      let host = '';
      try { host = new URL(s.url).hostname.replace(/^www\./, ''); } catch (_) { /* ignore */ }
      return `<li><a href="${esc(s.url)}" target="_blank" rel="noopener"><span class="src-title">${esc(s.title || s.url)}</span><span class="src-host">${esc(host)}</span></a></li>`;
    }).join('');
  }

  function renderDialog() {
    const d = filtered[openIndex];
    if (!d) return;
    const lang = state.lang;
    const hl = (d.highlights && d.highlights[lang]) || [];
    const tech = (d.technologies || []).map((tg) => `<span class="tag">${esc(tg)}</span>`).join('');
    dialog.dataset.a = d.agentType;
    dialog.innerHTML = `
      <div class="dialog__head">
        <div class="dialog__title">
          <p class="dialog__meta"><span class="plate__no">No.${String(d.n).padStart(4, '0')}</span><span class="plate__ag">${esc(agLabel(d.agentType, lang))}</span><span class="dialog__ind">${esc(indLabel(d.industry, lang))}</span></p>
          <h2 id="dlg-title">${esc(d.company)}${d.isNew ? ` <span class="flag flag--new">${t('badgeNew')}</span>` : ''}</h2>
        </div>
        <button type="button" class="icon-btn dialog__close" id="dlg-close" aria-label="${t('close')}">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
      </div>
      <div class="dialog__body">
        <section>
          <h4>${t('secOverview')}</h4>
          <p class="lead">${esc(d.overview[lang])}</p>
        </section>
        ${hl.length ? `<section><h4>${t('secHighlights')}</h4><ul class="hl">${listItems(hl)}</ul></section>` : ''}
        ${tech ? `<section><h4>${t('secTech')}</h4><div class="tech-tags">${tech}</div></section>` : ''}
        <section>
          <h4>${t('secSources')}</h4>
          ${d.needsReview ? `<p class="src-note"><span class="material-symbols-rounded" aria-hidden="true">info</span>${t('singleSrcNote')}</p>` : ''}
          <ol class="sources">${sourceItems(d.sources)}</ol>
        </section>
        <div class="dialog__foot">
          <a class="btn-solid" href="${esc(GCP_ARTICLE)}" target="_blank" rel="noopener">
            <span class="material-symbols-rounded" aria-hidden="true">open_in_new</span>${t('original')}
          </a>
          <div class="dialog__nav">
            <button type="button" class="btn-line" id="dlg-prev"><span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>${t('prev')}</button>
            <button type="button" class="btn-line" id="dlg-next">${t('next')}<span class="material-symbols-rounded" aria-hidden="true">arrow_forward</span></button>
          </div>
        </div>
      </div>`;
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
      document.body.classList.add('is-locked');
    }
    $('#dlg-close').focus();
  }
  function closeDialog() {
    if (openIndex < 0) return;
    openIndex = -1;
    scrim.classList.remove('open');
    document.body.classList.remove('is-locked');
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => { scrim.hidden = true; }, reduceMotion ? 0 : 260);
    if (lastFocus) lastFocus.focus();
  }
  scrim.addEventListener('click', (e) => { if (e.target === scrim) closeDialog(); });

  function trapTab(e, box) {
    const f = $$('a[href], button:not([disabled]), input', box).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !box.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (active === last || !box.contains(active))) { e.preventDefault(); first.focus(); }
  }

  document.addEventListener('keydown', (e) => {
    if (openIndex >= 0) {
      if (e.key === 'Escape') { closeDialog(); return; }
      if (e.key === 'Tab') { trapTab(e, dialog); return; }
      if (e.key === 'ArrowLeft') openDialog((openIndex - 1 + filtered.length) % filtered.length);
      else if (e.key === 'ArrowRight') openDialog((openIndex + 1) % filtered.length);
      return;
    }
    if (!sheet.hidden) {
      if (e.key === 'Escape') closeSheet(false);
      else if (e.key === 'Tab') trapTab(e, $('.sheet', sheet));
      return;
    }
    if (e.key === '/' && document.activeElement !== searchEl && !/input|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); searchEl.focus();
    }
  });

  /* ---------- GitHub star ----------
     星數改從 shields.io 的 JSON 取（伺服器端快取、不吃訪客的 GitHub API 額度，
     不會再因為未驗證請求被限流而 403）。結果快取在 sessionStorage；
     失敗或 0 顆就不顯示數字。 */
  function showStars(v) {
    if (!v || v === '0' || !/^[0-9][0-9.,]*k?$/i.test(v)) return;
    const el = $('#gh-count');
    el.textContent = v;
    el.hidden = false;
  }
  (function loadStars() {
    const KEY = 'genai.stars';
    let cached = null;
    try { cached = sessionStorage.getItem(KEY); } catch (_) { /* ignore */ }
    if (cached !== null) { showStars(cached); return; }
    const remember = (v) => { try { sessionStorage.setItem(KEY, v); } catch (_) { /* ignore */ } };
    fetch(STARS_API)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const v = j && typeof j.value === 'string' ? j.value.trim() : '0';
        remember(v);
        showStars(v);
      })
      .catch(() => remember('0'));
  }());

  /* ---------- init ---------- */
  function applyStaticI18n() {
    $('#search').placeholder = t('searchPlaceholder');
    $('#stat-total').textContent = fmt(DATA.length);
    $('#count-line').innerHTML = t('countLine')(INDUSTRIES.length, AGENT_TYPES.length).map((x) => `<span>${esc(x)}</span>`).join('');
    applyTheme();
  }

  applyStaticI18n();
  applyView();
  renderMatrices();
  renderActive();

  // 預先寫進 HTML 的卡片若與目前資料、語言、篩選完全一致，就直接沿用，不重繪 1,276 張卡。
  const grid = $('#grid');
  if (grid.dataset.sig === sigOf() && grid.querySelector('.plate')) {
    filtered = DATA;
    shown = DATA.length;
    $('#result-count').textContent = t('results')(filtered.length);
    $('#sheet-apply').textContent = t('showN')(filtered.length);
    $('#load-sentinel').hidden = true;
  } else {
    renderCards();
  }

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
