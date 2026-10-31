/* BiomedFacts — full-text search. Does not change existing templates or category logic. */
(function () {
  'use strict';
  const scriptEl = document.currentScript || Array.from(document.scripts).find(s => (s.src || '').includes('/biomedfacts-search.js'));
  if (!scriptEl || !scriptEl.src) return;
  const scriptUrl = new URL(scriptEl.src, window.location.href);
  const cssUrl = new URL('../css/biomedfacts-search.css', scriptUrl).href;
  const indexUrl = new URL('../../search-index.json', scriptUrl).href;
  const lang = (document.documentElement.lang || '').toLowerCase().startsWith('en') || window.location.pathname.startsWith('/en/') ? 'en' : 'el';
  const strings = {
    el: {
      label: 'Αναζήτηση άρθρων', placeholder: 'Τίτλος, θέμα ή λέξη-κλειδί…',
      open: 'Άνοιγμα αναζήτησης', close: 'Κλείσιμο αναζήτησης',
      count: n => `${n} ${n === 1 ? 'αποτέλεσμα' : 'αποτελέσματα'}`,
      loading: 'Φόρτωση άρθρων…', error: 'Η αναζήτηση δεν είναι διαθέσιμη αυτή τη στιγμή.',
      empty: 'Δεν βρέθηκαν σχετικά άρθρα. Δοκίμασε άλλη λέξη-κλειδί.',
      more: n => `Εμφανίζονται τα πρώτα ${n} αποτελέσματα.`
    },
    en: {
      label: 'Search articles', placeholder: 'Title, topic or keyword…',
      open: 'Open search', close: 'Close search',
      count: n => `${n} ${n === 1 ? 'result' : 'results'}`,
      loading: 'Loading articles…', error: 'Search is currently unavailable.',
      empty: 'No matching articles. Try another keyword.',
      more: n => `Showing the first ${n} results.`
    }
  };
  const t = strings[lang];
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="m15.5 15.5 5 5"></path></svg>';
  const norm = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ');
  const stripExtraSpace = s => String(s || '').replace(/\s+/g, ' ').trim();
  const LIMIT = 20;
  let dataset = null;
  let fetchPromise = null;
  let previousFocus = null;
  let previousBodyOverflow = '';

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = cssUrl;
  document.head.appendChild(css);

  function initialize() {
    const actions = document.querySelector('.header-actions');
    if (!actions || document.getElementById('bf-search-trigger')) return;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'bf-search-trigger';
    trigger.className = 'icon-button bf-search-trigger';
    trigger.setAttribute('aria-label', t.open);
    trigger.title = t.label;
    trigger.innerHTML = icon;
    const languageControl = actions.querySelector('.language-switch');
    if (languageControl) languageControl.insertAdjacentElement('afterend', trigger);
    else actions.prepend(trigger);

    const backdrop = document.createElement('div');
    backdrop.id = 'bf-search-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.innerHTML = `
      <div id="bf-search-dialog" role="dialog" aria-modal="true" aria-labelledby="bf-search-title">
        <div id="bf-search-header">
          <div id="bf-search-heading-row">
            <h2 id="bf-search-title"></h2>
            <button id="bf-search-close" type="button" aria-label=""></button>
          </div>
          <label id="bf-search-field" for="bf-search-input">
            ${icon}
            <input id="bf-search-input" type="search" autocomplete="off" spellcheck="false">
          </label>
        </div>
        <div id="bf-search-counter" role="status" aria-live="polite"></div>
        <div id="bf-search-results"></div>
      </div>`;
    document.body.appendChild(backdrop);

    const input = document.getElementById('bf-search-input');
    const counter = document.getElementById('bf-search-counter');
    const results = document.getElementById('bf-search-results');
    const close = document.getElementById('bf-search-close');
    document.getElementById('bf-search-title').textContent = t.label;
    input.placeholder = t.placeholder;
    input.setAttribute('aria-label', t.label);
    close.setAttribute('aria-label', t.close);
    close.textContent = '×';
    const setMessage = msg => {
      results.replaceChildren();
      const p = document.createElement('p'); p.className = 'bf-search-msg'; p.textContent = msg;
      results.appendChild(p);
    };

    function ranked(posts, rawQuery) {
      const tokens = norm(rawQuery.trim()).split(/\s+/).filter(Boolean);
      if (!tokens.length) return posts.map((post, i) => ({post, score: 0, order: i}));
      const queryNorm = norm(rawQuery.trim());
      const rankedPosts = [];
      posts.forEach((post, order) => {
        const title = norm(post.title), excerpt = norm(post.excerpt);
        const category = norm(post.category), body = norm(post.body);
        let score = 0;
        for (const tok of tokens) {
          if (title.includes(tok)) score += 75;
          else if (excerpt.includes(tok)) score += 24;
          else if (category.includes(tok)) score += 12;
          else if (body.includes(tok)) score += 3;
          else return;
        }
        if (title.includes(queryNorm)) score += 85;
        if (excerpt.includes(queryNorm)) score += 15;
        rankedPosts.push({post, score, order});
      });
      return rankedPosts.sort((a,b) => b.score - a.score || a.order - b.order);
    }

    function snippet(post, rawQuery) {
      const summary = stripExtraSpace(post.excerpt);
      const qTokens = norm(rawQuery.trim()).split(/\s+/).filter(Boolean);
      if (!qTokens.length || qTokens.some(tok => norm(summary).includes(tok))) return summary;
      const body = stripExtraSpace(post.body);
      const normalizedBody = norm(body);
      const indexes = qTokens.map(tok => normalizedBody.indexOf(tok)).filter(i => i >= 0);
      if (!indexes.length) return summary;
      const first = Math.min(...indexes);
      const start = Math.max(0, first - 85);
      const excerpt = body.slice(start, start + 215).trim();
      return (start ? '…' : '') + excerpt + (start + 215 < body.length ? '…' : '');
    }

    function render() {
      if (!dataset) return;
      const matches = ranked(dataset, input.value);
      counter.textContent = t.count(matches.length);
      results.replaceChildren();
      if (!matches.length) { setMessage(t.empty); return; }
      matches.slice(0, LIMIT).forEach(({post}) => {
        const article = document.createElement('article'); article.className = 'bf-search-item';
        const category = document.createElement('small'); category.className = 'bf-search-category'; category.textContent = post.category || '';
        const link = document.createElement('a'); link.className = 'bf-search-link';
        link.textContent = post.title || '';
        try {
          const target = new URL(post.url, window.location.origin);
          if (target.origin !== window.location.origin) return;
          link.href = target.href;
        } catch (_) { return; }
        const summary = document.createElement('p'); summary.className = 'bf-search-snippet'; summary.textContent = snippet(post, input.value);
        article.append(category, link, summary);
        results.appendChild(article);
      });
      if (matches.length > LIMIT) {
        const note = document.createElement('p'); note.className = 'bf-search-msg';
        note.textContent = t.more(LIMIT); results.appendChild(note);
      }
    }

    async function loadIndex() {
      if (dataset) return dataset;
      if (!fetchPromise) {
        fetchPromise = fetch(indexUrl, {credentials:'same-origin'})
          .then(r => { if (!r.ok) throw new Error('search-index HTTP '+r.status); return r.json(); })
          .then(data => {
            if (!Array.isArray(data)) throw new Error('Invalid search index');
            dataset = data.filter(p => p && p.lang === lang && typeof p.title === 'string' && typeof p.url === 'string');
            return dataset;
          })
          .catch(err => { fetchPromise = null; throw err; });
      }
      return fetchPromise;
    }

    async function openSearch() {
      previousFocus = document.activeElement;
      backdrop.classList.add('bf-open');
      backdrop.setAttribute('aria-hidden', 'false');
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      input.focus();
      if (!dataset) {
        counter.textContent = '';
        setMessage(t.loading);
        try { await loadIndex(); if (backdrop.classList.contains('bf-open')) render(); }
        catch (e) { if (backdrop.classList.contains('bf-open')) setMessage(t.error); }
      } else render();
    }
    function closeSearch() {
      backdrop.classList.remove('bf-open');
      backdrop.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousBodyOverflow;
      (previousFocus && previousFocus.isConnected ? previousFocus : trigger).focus();
    }
    trigger.addEventListener('click', openSearch);
    close.addEventListener('click', closeSearch);
    input.addEventListener('input', render);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeSearch(); });
    backdrop.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
      if (e.key === 'Tab') {
        const list = [close, input, ...results.querySelectorAll('a[href]')];
        if (!list.length) return;
        const first = list[0], last = list[list.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
  else initialize();
})();
