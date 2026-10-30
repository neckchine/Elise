/* Navigation entre les écrans et démarrage de l'application. */
// [écran, chemin, icône, libellé, groupe]
const NAV = [
  ['dashboard', '', 'home', 'Aujourd\'hui', 'Consultations'],
  ['agenda', 'agenda', 'calendar', 'Agenda', 'Consultations'],
  ['clients', 'clients', 'users', 'Clients', 'Consultations'],
  ['reservation', 'reservation', 'globe', 'Réservation en ligne', 'Consultations'],
  ['factures', 'factures', 'invoice', 'Factures', 'Gestion'],
  ['compta', 'compta', 'chart', 'Comptabilité', 'Gestion'],
  ['courriers', 'courriers', 'letter', 'Courriers', 'Gestion'],
  ['messages', 'messages', 'whatsapp', 'WhatsApp', 'Échanges'],
  ['visio', 'visio', 'video', 'Visio', 'Échanges'],
  ['parametres', 'parametres', 'settings', 'Paramètres', null],
];
// Onglets affichés en bas de l'écran sur téléphone
const TABS = ['dashboard', 'agenda', 'clients', 'factures'];

const App = {
  route() {
    const [path, param] = location.hash.replace(/^#\/?/, '').split('/');
    if (path === 'reserver') return { view: 'reservation', public: true };
    const item = NAV.find(n => n[1] === path) || NAV[0];
    return { view: item[0], param };
  },

  renderNav() {
    const { view } = this.route();
    const s = Store.settings;
    const pending = Store.list('demandes').filter(d => d.statut === 'attente').length;
    const late = Store.list('factures').filter(f => Store.invoiceStatus(f) === 'retard').length;
    const badges = { dashboard: pending, factures: late };
    const link = ([key, path, ic, label]) => `
      <a href="#/${path}" class="nav-item ${view === key ? 'active' : ''}" ${view === key ? 'aria-current="page"' : ''}>
        ${icon(ic, 18)}<span>${label}</span>${badges[key] ? `<span class="nav-badge">${badges[key]}</span>` : ''}
      </a>`;
    const groups = [...new Set(NAV.map(n => n[4]))];
    document.getElementById('nav').innerHTML = groups.map(g => `
      <div class="nav-group">${g ? `<span class="nav-label">${g}</span>` : ''}${NAV.filter(n => n[4] === g).map(link).join('')}</div>`).join('');
    const inTabs = TABS.includes(view);
    document.getElementById('tabbar').innerHTML = TABS.map(k => NAV.find(n => n[0] === k)).map(([key, path, ic, label]) => `
      <a href="#/${path}" class="tab-item ${view === key ? 'active' : ''}">${icon(ic, 22)}<span>${key === 'dashboard' ? 'Accueil' : label}</span>${badges[key] ? '<i class="tab-dot"></i>' : ''}</a>`).join('') +
      `<button class="tab-item ${inTabs ? '' : 'active'}" data-more>${icon('menu', 22)}<span>Plus</span></button>`;
    document.querySelector('#tabbar [data-more]').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('me').innerHTML = `
      <span class="avatar">${U.esc(s.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</span>
      <span><strong>${U.esc(s.nom)}</strong><br><span class="muted small">${U.esc(s.profession)}</span></span>`;
  },

  refresh() {
    const r = this.route();
    document.body.classList.toggle('public', !!r.public);
    const main = document.getElementById('main');
    // Recrée le conteneur pour repartir sans anciens écouteurs d'événements
    const fresh = main.cloneNode(false);
    main.replaceWith(fresh);
    Views[r.view].render(fresh, { param: r.param, publicMode: r.public });
    document.title = `${Views[r.view].title} · Cabinet`;
    if (!r.public) this.renderNav();
    document.body.classList.remove('nav-open');
  },

  start() {
    Store.load();
    window.addEventListener('hashchange', () => {
      document.querySelectorAll('.modal-backdrop [data-close]').forEach(b => b.click());
      this.refresh(); window.scrollTo(0, 0);
    });
    document.getElementById('nav-backdrop').onclick = () => document.body.classList.remove('nav-open');
    // Synchronise si l'application est ouverte dans plusieurs onglets (ex. page de réservation)
    window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY && !document.querySelector('.modal-backdrop')) { Store.load(); this.refresh(); } });
    this.refresh();
  },
};

document.addEventListener('DOMContentLoaded', () => App.start());
