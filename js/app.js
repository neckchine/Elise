/* Navigation entre les écrans et démarrage de l'application. */
const NAV = [
  ['dashboard', '', 'home', 'Accueil'],
  ['agenda', 'agenda', 'calendar', 'Agenda'],
  ['clients', 'clients', 'users', 'Clients'],
  ['factures', 'factures', 'invoice', 'Factures'],
  ['compta', 'compta', 'chart', 'Comptabilité'],
  ['courriers', 'courriers', 'letter', 'Courriers'],
  ['messages', 'messages', 'whatsapp', 'WhatsApp'],
  ['visio', 'visio', 'video', 'Visio'],
  ['reservation', 'reservation', 'globe', 'RDV en ligne'],
  ['parametres', 'parametres', 'settings', 'Paramètres'],
];

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
    document.getElementById('nav').innerHTML = NAV.map(([key, path, ic, label]) => `
      <a href="#/${path}" class="nav-item ${view === key ? 'active' : ''}" ${view === key ? 'aria-current="page"' : ''}>
        ${icon(ic)}<span>${label}</span>${badges[key] ? `<span class="nav-badge">${badges[key]}</span>` : ''}
      </a>`).join('');
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
    document.getElementById('menu-btn').onclick = () => document.body.classList.toggle('nav-open');
    document.getElementById('nav-backdrop').onclick = () => document.body.classList.remove('nav-open');
    // Synchronise si l'application est ouverte dans plusieurs onglets (ex. page de réservation)
    window.addEventListener('storage', (e) => { if (e.key === STORAGE_KEY && !document.querySelector('.modal-backdrop')) { Store.load(); this.refresh(); } });
    this.refresh();
  },
};

document.addEventListener('DOMContentLoaded', () => App.start());
