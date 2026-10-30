/* Liste des clients et fiche détaillée. */
Views.clients = {
  title: 'Clients',
  q: '',

  render(el, { param } = {}) {
    if (param) return this.renderDetail(el, param);
    const q = this.q.toLowerCase();
    const list = Store.clientsSorted().filter(c =>
      !q || `${c.prenom} ${c.nom} ${c.tel} ${c.email}`.toLowerCase().includes(q));
    const now = new Date().toISOString();
    const nextOf = (id) => Store.list('events').filter(e => e.clientId === id && e.start > now && e.statut === 'prevu')
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    const dueOf = (id) => Store.list('factures').filter(f => f.clientId === id && ['envoyee', 'retard'].includes(Store.invoiceStatus(f)))
      .reduce((t, f) => t + Store.invoiceTotal(f), 0);

    el.innerHTML = `
      <div class="page-head">
        <div><h1>Clients</h1><p class="muted">${Store.list('clients').length} client(s)</p></div>
        <div class="head-actions">
          <input class="search" type="search" placeholder="Rechercher un nom, un téléphone…" value="${U.esc(this.q)}">
          <button class="btn primary" data-new>${icon('plus', 18)} Nouveau client</button>
        </div>
      </div>
      <section class="card flush">
        ${list.length ? `<ul class="list clickable">${list.map(c => {
          const next = nextOf(c.id), due = dueOf(c.id);
          return `<li class="row" data-id="${c.id}">
            <span class="avatar">${U.esc((c.prenom[0] || '') + (c.nom[0] || '')).toUpperCase()}</span>
            <span class="grow"><strong>${U.esc(c.prenom)} ${U.esc(c.nom)}</strong><br>
              <span class="muted small">${U.esc(c.tel || 'pas de téléphone')} ${c.email ? '· ' + U.esc(c.email) : ''}</span></span>
            <span class="hide-sm muted small">${next ? `Prochain RDV : ${U.fmtDate(next.start)} ${U.fmtTime(next.start)}` : ''}</span>
            ${due ? `<span class="badge badge-orange">${U.fmtMoney(due)} dû</span>` : ''}
            ${icon('right', 18)}
          </li>`;
        }).join('')}</ul>` : UI.empty(q ? 'Aucun client ne correspond.' : 'Aucun client pour le moment.')}
      </section>`;

    const search = el.querySelector('.search');
    search.oninput = () => { this.q = search.value; this.render(el); const s = el.querySelector('.search'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); };
    el.querySelector('[data-new]').onclick = () => Actions.openClient();
    el.querySelectorAll('[data-id]').forEach(r => r.onclick = () => { location.hash = `#/clients/${r.dataset.id}`; });
  },

  renderDetail(el, id) {
    const c = Store.get('clients', id);
    if (!c) { location.hash = '#/clients'; return; }
    const events = Store.list('events').filter(e => e.clientId === id).sort((a, b) => b.start.localeCompare(a.start));
    const now = new Date().toISOString();
    const upcoming = events.filter(e => e.start >= now).reverse();
    const past = events.filter(e => e.start < now);
    const factures = Store.list('factures').filter(f => f.clientId === id).sort((a, b) => b.date.localeCompare(a.date));
    const courriers = Store.list('courriers').filter(x => x.clientId === id);
    const messages = Store.list('messages').filter(m => m.clientId === id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const total = factures.filter(f => f.statut === 'payee').reduce((t, f) => t + Store.invoiceTotal(f), 0);

    const evRow = (e) => `<li class="row" data-ev="${e.id}">
      <span class="time">${U.fmtDate(e.start, { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
      <span class="grow">${U.fmtTime(e.start)} · ${e.mode === 'visio' ? 'Visio' : 'Cabinet'}</span>
      ${UI.badge(e.statut)} ${e.factureId ? '<span class="badge badge-green">Facturé</span>' : ''}</li>`;

    el.innerHTML = `
      <a class="back" href="#/clients">${icon('left', 18)} Tous les clients</a>
      <div class="page-head">
        <div class="client-title">
          <span class="avatar big">${U.esc((c.prenom[0] || '') + (c.nom[0] || '')).toUpperCase()}</span>
          <div><h1>${U.esc(c.prenom)} ${U.esc(c.nom)}</h1>
            <p class="muted">${U.esc(c.tel || '')} ${c.email ? '· ' + U.esc(c.email) : ''}</p></div>
        </div>
        <div class="head-actions">
          <button class="btn ghost" data-edit>Modifier</button>
          <button class="btn whatsapp" data-wa>${icon('whatsapp', 18)} WhatsApp</button>
          <button class="btn primary" data-rdv>${icon('plus', 18)} Rendez-vous</button>
        </div>
      </div>

      <div class="cols">
        <div class="stack">
          <section class="card">
            <h2>${icon('user')} Informations</h2>
            <dl class="info">
              ${c.naissance ? `<dt>Naissance</dt><dd>${U.fmtDateShort(c.naissance)}</dd>` : ''}
              ${c.adressePar ? `<dt>Adressé(e) par</dt><dd>${U.esc(c.adressePar)}</dd>` : ''}
              ${c.adresse ? `<dt>Adresse</dt><dd>${U.nl2br(c.adresse)}</dd>` : ''}
              <dt>Séances</dt><dd>${past.filter(e => e.statut === 'honore').length} honorée(s)</dd>
              <dt>Total réglé</dt><dd>${U.fmtMoney(total)}</dd>
            </dl>
            ${c.notes ? `<p class="quote">${U.nl2br(c.notes)}</p>` : ''}
          </section>
          <section class="card">
            <h2>${icon('calendar')} Prochains rendez-vous</h2>
            ${upcoming.length ? `<ul class="list clickable">${upcoming.map(evRow).join('')}</ul>` : UI.empty('Aucun rendez-vous prévu.')}
          </section>
          <section class="card">
            <h2>${icon('clock')} Historique</h2>
            ${past.length ? `<ul class="list clickable">${past.map(evRow).join('')}</ul>` : UI.empty('Pas encore de séance.')}
          </section>
        </div>
        <div class="stack">
          <section class="card">
            <h2>${icon('invoice')} Factures <button class="btn small ghost push" data-inv>${icon('plus', 16)} Facture</button></h2>
            ${factures.length ? `<ul class="list clickable">${factures.map(f => `
              <li class="row" data-f="${f.id}"><span class="grow"><strong>${U.esc(f.numero || 'Brouillon')}</strong>
                <span class="muted">· ${U.fmtDateShort(f.date)}</span></span>
                <span>${U.fmtMoney(Store.invoiceTotal(f))}</span> ${UI.badge(Store.invoiceStatus(f))}</li>`).join('')}</ul>`
              : UI.empty('Aucune facture.')}
          </section>
          <section class="card">
            <h2>${icon('letter')} Courriers <button class="btn small ghost push" data-letter>${icon('plus', 16)} Courrier</button></h2>
            ${courriers.length ? `<ul class="list clickable">${courriers.map(x => `
              <li class="row" data-c="${x.id}"><span class="grow"><strong>${U.esc(x.objet)}</strong><br>
                <span class="muted small">À ${U.esc(x.destinataire.split('\n')[0])} · ${U.fmtDateShort(x.date)}</span></span></li>`).join('')}</ul>`
              : UI.empty('Aucun courrier.')}
          </section>
          <section class="card">
            <h2>${icon('chat')} Derniers messages</h2>
            ${messages.length ? `<ul class="list">${messages.map(m => `
              <li class="row"><span class="grow small">${U.esc(m.texte.slice(0, 110))}${m.texte.length > 110 ? '…' : ''}<br>
                <span class="muted">${U.fmtDate(m.date)} · ${m.canal === 'email' ? 'E-mail' : 'WhatsApp'}</span></span></li>`).join('')}</ul>`
              : UI.empty('Aucun message envoyé.')}
          </section>
        </div>
      </div>`;

    el.querySelector('[data-edit]').onclick = () => Actions.openClient(id);
    el.querySelector('[data-wa]').onclick = () => Actions.composeMessage({ clientId: id, text: `Bonjour ${c.prenom}, `, email: 'Message' });
    el.querySelector('[data-rdv]').onclick = () => Actions.openEvent({ clientId: id, start: U.fromDateTime(U.isoDate(U.addDays(new Date(), 1)), '10:00') });
    el.querySelector('[data-inv]').onclick = () => Actions.openInvoice({ clientId: id });
    el.querySelector('[data-letter]').onclick = () => Views.courriers.open({ clientId: id });
    el.querySelectorAll('[data-ev]').forEach(r => r.onclick = () => Actions.openEvent({ id: r.dataset.ev }));
    el.querySelectorAll('[data-f]').forEach(r => r.onclick = () => Actions.openInvoice({ id: r.dataset.f }));
    el.querySelectorAll('[data-c]').forEach(r => r.onclick = () => Views.courriers.open({ id: r.dataset.c }));
  },
};
