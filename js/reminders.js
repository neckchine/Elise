/* Rappels automatiques de rendez-vous : la veille et 30 minutes avant.
   Tant que l'application est ouverte, chaque rappel arrivé à échéance est présenté
   dans un encadré ; un clic l'envoie par WhatsApp. */
const REMINDERS = [
  { key: 'veille', label: 'Rappel la veille', short: 'Veille', minutes: 24 * 60 },
  { key: 'h30', label: 'Rappel 30 min avant', short: '30 min avant', minutes: 30 },
];

const Reminders = {
  collapsed: false,

  enabled(key) {
    return !!(Store.settings.rappelsAuto || {})[key];
  },

  sentAt(ev, key) {
    return ev.rappels?.[key] || (key === 'veille' ? ev.rappelEnvoye : null) || null;
  },

  // État de chaque rappel d'un rendez-vous : envoyé, ignoré, à envoyer, prévu ou désactivé
  states(ev, now = new Date()) {
    const start = new Date(ev.start);
    return REMINDERS.map(r => {
      const due = new Date(start.getTime() - r.minutes * 60000);
      const sent = this.sentAt(ev, r.key);
      let state = 'prevu';
      if (!this.enabled(r.key)) state = 'off';
      else if (sent === 'ignore') state = 'ignore';
      else if (sent) state = 'envoye';
      // À moins de 30 min de la séance, le rappel de la veille n'a plus de sens
      else if (start <= now || (r.key === 'veille' && start - now <= 30 * 60000)) state = 'passe';
      else if (due <= now) state = 'due';
      return { ...r, due, sent, state };
    });
  },

  // Rappels à envoyer maintenant
  due(now = new Date()) {
    const list = [];
    for (const ev of Store.list('events')) {
      if (ev.type !== 'rdv' || ev.statut !== 'prevu') continue;
      const st = this.states(ev, now);
      for (const s of st) if (s.state === 'due') list.push({ event: ev, ...s });
    }
    return list.sort((a, b) => a.event.start.localeCompare(b.event.start));
  },

  text(ev, key) {
    const client = Store.get('clients', ev.clientId);
    const m = Store.settings.modeles;
    const tpl = key === 'h30' ? m.rappel30 : (ev.mode === 'visio' ? m.visio : m.rappel);
    return U.fill(tpl, Actions.vars({ client, event: ev }));
  },

  send(eventId, key) {
    const ev = Store.get('events', eventId);
    if (!ev) return;
    if (!Actions.whatsapp(ev.clientId, this.text(ev, key), key === 'h30' ? 'rappel30' : 'rappel')) return;
    this.mark(ev, key, new Date().toISOString());
    UI.toast('Rappel envoyé');
  },

  skip(eventId, key) {
    const ev = Store.get('events', eventId);
    if (ev) this.mark(ev, key, 'ignore');
  },

  mark(ev, key, value) {
    Store.upsert('events', { id: ev.id, rappels: { ...(ev.rappels || {}), [key]: value } });
    App.refresh();
  },

  // Petites étiquettes d'état, utilisées sur l'accueil et dans la fiche du rendez-vous
  chips(ev) {
    return this.states(ev).filter(s => s.state !== 'off').map(s => {
      const txt = {
        envoye: `envoyé ${U.sameDay(s.sent, new Date()) ? 'à ' + U.fmtTime(s.sent) : 'le ' + U.fmtDate(s.sent)}`,
        ignore: 'ignoré',
        due: 'à envoyer',
        prevu: `prévu ${U.sameDay(s.due, new Date()) ? 'à ' + U.fmtTime(s.due) : U.fmtDate(s.due) + ' ' + U.fmtTime(s.due)}`,
        passe: 'non envoyé',
      }[s.state];
      const color = { envoye: 'green', ignore: 'grey', due: 'orange', prevu: 'grey', passe: 'grey' }[s.state];
      return `<span class="st st-${color}">${s.short} : ${txt}</span>`;
    }).join(' ');
  },

  // Encadré flottant, visible sur tous les écrans quand un rappel est à envoyer
  renderTray() {
    const tray = document.getElementById('reminder-tray');
    if (!tray) return;
    const due = document.body.classList.contains('public') ? [] : this.due();
    document.title = document.title.replace(/^\(\d+\) /, '');
    if (!due.length) { tray.hidden = true; tray.innerHTML = ''; return; }
    document.title = `(${due.length}) ${document.title}`;
    tray.hidden = false;
    tray.classList.toggle('is-collapsed', this.collapsed);
    if (this.collapsed) {
      tray.innerHTML = `<button class="tray-pill" data-expand>${icon('whatsapp', 16)} ${due.length} rappel${due.length > 1 ? 's' : ''} à envoyer</button>`;
      return;
    }
    tray.innerHTML = `
      <div class="tray-head"><h2>Rappels à envoyer maintenant <span class="count">${due.length}</span></h2>
        <button class="icon-btn" data-collapse aria-label="Réduire" title="Réduire">${icon('right', 16)}</button></div>
      <ul class="list">${due.map(d => `
        <li class="row">
          <span class="grow"><strong>${U.esc(Store.clientName(d.event.clientId))}</strong>
            <span class="meta">${d.label.toLowerCase()} · séance ${U.sameDay(d.event.start, new Date()) ? 'à' : U.fmtDate(d.event.start) + ' à'} ${U.fmtTime(d.event.start)}</span></span>
          <span class="row-actions">
            <button class="icon-btn" data-skip="${d.event.id}|${d.key}" aria-label="Ne pas envoyer ce rappel" title="Ne pas envoyer">${icon('close', 16)}</button>
            <button class="btn small whatsapp" data-send="${d.event.id}|${d.key}">${icon('whatsapp', 16)} Envoyer</button>
          </span>
        </li>`).join('')}</ul>`;
  },

  start() {
    const tray = document.getElementById('reminder-tray');
    tray.addEventListener('click', (e) => {
      if (e.target.closest('[data-collapse]')) { this.collapsed = true; return this.renderTray(); }
      if (e.target.closest('[data-expand]')) { this.collapsed = false; return this.renderTray(); }
      const b = e.target.closest('[data-send],[data-skip]');
      if (!b) return;
      const [id, key] = (b.dataset.send || b.dataset.skip).split('|');
      if (b.dataset.send) this.send(id, key); else this.skip(id, key);
    });
    // Vérifie toutes les 30 secondes si un rappel arrive à échéance
    setInterval(() => this.renderTray(), 30000);
  },
};
