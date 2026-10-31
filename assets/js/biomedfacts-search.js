/* BiomedFacts — full-text search. Does not change existing templates or category logic. */
(function () {
  'use strict';
  const scriptEl = document.currentScript || Array.from(document.scripts).find(s => (s.src || '').includes('/biomedfacts-search.js'));
  if (!scriptEl || !scriptEl.src) return;
  const scriptUrl = new URL(scriptEl.src, window.location.href);
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

  // Embed the full search stylesheet to avoid broken links / loading races.
  // No change to the site's existing CSS or templates is needed.
  const css = document.createElement('style');
  css.id = 'bf-search-inline-style';
  css.textContent = "/* BiomedFacts — Search overlay. All selectors scoped to bf-search. */\n#bf-search-backdrop, #bf-search-backdrop * { box-sizing: border-box; }\n.bf-search-trigger { flex-shrink:0; }\n#bf-search-backdrop {\n  position: fixed; inset: 0; z-index: 999900;\n  background: rgba(22, 13, 32, .58);\n  display: none; align-items: flex-start; justify-content: center;\n  padding: max(18px, 8vh) 14px 22px;\n}\n#bf-search-backdrop.bf-open { display: flex; }\n#bf-search-dialog {\n  background: #fff; color: #191722; border-radius: 13px;\n  width: min(760px, 100%); max-height: min(82vh, 830px);\n  box-shadow: 0 20px 75px rgba(15, 9, 29, .34);\n  display: flex; flex-direction: column; overflow: hidden;\n  font-family: Arial, Helvetica, sans-serif; text-align: left;\n}\n#bf-search-header { padding: 22px 23px 16px; border-bottom: 1px solid #e3d9ed; flex: 0 0 auto; }\n#bf-search-heading-row { display:flex; align-items:center; justify-content:space-between; gap:20px; }\n#bf-search-title { font: 700 27px/1.2 Georgia, 'Times New Roman', serif; letter-spacing:-.5px; margin:0; color:#191722; }\n#bf-search-close { border:0; background:#f0eaf8; color:#39294d; border-radius:5px; font: 500 25px/1 Arial, sans-serif; width:39px; height:39px; cursor:pointer; }\n#bf-search-close:hover { background:#e4d3f7; }\n#bf-search-field {\n  display:flex; align-items:center; gap:12px; border:1.5px solid #b8a0d8;\n  border-radius:7px; padding:11px 14px; margin-top:17px;\n  background:#fff;\n}\n#bf-search-field:focus-within { outline:2px solid #7a4fbc; outline-offset:2px; }\n#bf-search-field svg { flex-shrink:0; width:21px; height:21px; fill:none; stroke:#6c3bb8; stroke-width:2; }\n#bf-search-input {\n  border:0; outline:none; flex:1; width:100%; min-width:0; background:transparent;\n  color:#191722; font: 400 17px/1.3 Arial, sans-serif;\n}\n#bf-search-counter { padding:13px 23px 4px; font-size:12px; color:#6a6075; flex:0 0 auto; }\n#bf-search-results { overflow-y:auto; padding:0 23px 19px; min-height:80px; overscroll-behavior:contain; }\n.bf-search-item { border-bottom:1px solid #eee9f2; padding:17px 0; }\n.bf-search-item:last-child { border-bottom:0; }\n.bf-search-category { display:block; color:#7146b1; font:700 11px/1.3 Arial,sans-serif; letter-spacing:.65px; text-transform:uppercase; margin-bottom:7px; }\n.bf-search-link { display:block; color:#18151c; text-decoration:none; font:700 21px/1.24 Georgia,'Times New Roman',serif; }\n.bf-search-link:hover, .bf-search-link:focus-visible { color:#6532b1; text-decoration:underline; }\n.bf-search-snippet { color:#66616c; font:400 14px/1.5 Arial,sans-serif; margin:8px 0 0; }\n.bf-search-msg { color:#66616c; font:400 14px/1.6 Arial,sans-serif; padding:26px 0 12px; }\nhtml[data-theme='dark'] #bf-search-dialog { background:#1c1921; color:#f4f0f8; }\nhtml[data-theme='dark'] #bf-search-header { border-color:#4a3f50; }\nhtml[data-theme='dark'] #bf-search-title, html[data-theme='dark'] .bf-search-link { color:#f6f1f9; }\nhtml[data-theme='dark'] #bf-search-field { background:#231e2a; border-color:#735594; }\nhtml[data-theme='dark'] #bf-search-field svg { stroke:#c5a9ef; }\nhtml[data-theme='dark'] #bf-search-input { color:#f5f1f9; }\nhtml[data-theme='dark'] #bf-search-counter, html[data-theme='dark'] .bf-search-msg, html[data-theme='dark'] .bf-search-snippet { color:#c0b6c7; }\nhtml[data-theme='dark'] .bf-search-category { color:#d5bcff; }\nhtml[data-theme='dark'] .bf-search-item { border-color:#403846; }\nhtml[data-theme='dark'] .bf-search-link:hover { color:#c7a1ff; }\n@media(max-width:600px) {\n  #bf-search-backdrop { padding:5vh 9px 10px; }\n  #bf-search-dialog { max-height:88vh; border-radius:10px; }\n  #bf-search-header { padding:16px 15px 13px; }\n  #bf-search-title { font-size:23px; }\n  #bf-search-counter { padding:12px 16px 4px; }\n  #bf-search-results { padding:0 16px 16px; }\n  .bf-search-link { font-size:19px; }\n}\n\n/* Safety: keep search icons at their intended dimensions regardless of site CSS */\n#bf-search-trigger svg { display:block !important; width:20px !important; height:20px !important; max-width:20px !important; max-height:20px !important; }\n#bf-search-field svg { display:block !important; width:21px !important; height:21px !important; max-width:21px !important; max-height:21px !important; }\n";
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
