/* Composants d'interface : icônes, fenêtres, notifications. */
const Views = {};
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  invoice: '<path d="M6 2.5h9l4 4V21.5H6z"/><path d="M15 2.5v4h4M9 11h7M9 15h7M9 7h3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6 8.5 7 8.5-7"/>',
  chat: '<path d="M4 20l1.4-4A8 8 0 1 1 8 18.6z"/>',
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2"/><rect x="6" y="14" width="12" height="7"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4"/>',
  euro: '<path d="M17 6.5A7 7 0 1 0 17 17.5M4 10h10M4 14h10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
  whatsapp: '<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 18.8z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a4.5 4.5 0 0 1-2.2-2.2l.8-1-1-2z"/>',
};

function icon(name, size = 20) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

const UI = {
  modal({ title, body, footer = '', wide = false, onMount }) {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'modal-wide' : ''}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
        <header class="modal-head">
          <h2>${U.esc(title)}</h2>
          <button class="icon-btn" data-close aria-label="Fermer">${icon('close')}</button>
        </header>
        <div class="modal-body">${body}</div>
        ${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}
      </div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('[data-close]').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    root.appendChild(wrap);
    const first = wrap.querySelector('.modal-body input:not([type=hidden]), .modal-body select, .modal-body textarea');
    if (first) setTimeout(() => first.focus(), 30);
    const api = { el: wrap, close };
    if (onMount) onMount(wrap, api);
    return api;
  },

  confirm(message, { ok = 'Confirmer', danger = false } = {}) {
    return new Promise(resolve => {
      const m = UI.modal({
        title: 'Confirmation',
        body: `<p>${U.esc(message)}</p>`,
        footer: `<button class="btn ghost" data-no>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${U.esc(ok)}</button>`,
        onMount(el, api) {
          el.querySelector('[data-no]').onclick = () => { api.close(); resolve(false); };
          el.querySelector('[data-yes]').onclick = () => { api.close(); resolve(true); };
        },
      });
      return m;
    });
  },

  toast(msg, type = 'ok') {
    const root = document.getElementById('toast-root');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${U.esc(msg)}</span>`;
    root.appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
  },

  badge(status) {
    const map = {
      brouillon: ['Brouillon', 'grey'], envoyee: ['En attente', 'blue'], retard: ['En retard', 'red'], payee: ['Payée', 'green'],
      prevu: ['Prévu', 'blue'], honore: ['Honoré', 'green'], annule: ['Annulé', 'grey'], absent: ['Absent', 'red'],
      attente: ['À valider', 'orange'],
    };
    const [label, color] = map[status] || [status, 'grey'];
    return `<span class="st st-${color}">${label}</span>`;
  },

  clientOptions(selected, { allowEmpty = true } = {}) {
    return (allowEmpty ? '<option value="">— Choisir un client —</option>' : '') +
      Store.clientsSorted().map(c =>
        `<option value="${c.id}" ${c.id === selected ? 'selected' : ''}>${U.esc(c.nom.toUpperCase())} ${U.esc(c.prenom)}</option>`).join('');
  },

  empty(text, action = '') {
    return `<div class="empty"><p>${U.esc(text)}</p>${action}</div>`;
  },

  // Ouvre une fenêtre imprimable (factures, courriers) -> l'utilisateur peut « Enregistrer en PDF »
  printDoc(title, html) {
    let w = null;
    try { w = window.open('', '_blank'); } catch (e) { w = null; }
    // Si l'ouverture d'une fenêtre est bloquée, on affiche un aperçu du document
    if (!w) {
      UI.modal({ title, wide: true, body: `<style>${DOC_CSS}</style><div class="doc-preview">${html}</div>` });
      return;
    }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${U.esc(title)}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap" rel="stylesheet">
      <style>${PRINT_PAGE_CSS}${DOC_CSS}${Docs.pageFooterCSS(html)}</style></head>
      <body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  },
};
