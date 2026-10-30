/* Écran d'accueil : la journée en un coup d'œil. */
Views.dashboard = {
  title: 'Accueil',
  render(el) {
    const s = Store.settings;
    const now = new Date();
    const today = U.startOfDay(now);
    const todays = Store.eventsBetween(today, U.addDays(today, 1));
    const tomorrow = Store.eventsBetween(U.addDays(today, 1), U.addDays(today, 4))
      .filter(e => e.type === 'rdv' && e.statut === 'prevu');
    const demandes = Store.list('demandes').filter(d => d.statut === 'attente');
    const factures = Store.list('factures');
    const retard = factures.filter(f => Store.invoiceStatus(f) === 'retard');
    const enAttente = factures.filter(f => ['envoyee', 'retard'].includes(Store.invoiceStatus(f)));
    const aFacturer = Store.list('events').filter(e => e.type === 'rdv' && e.statut === 'honore' && !e.factureId);
    const month = U.isoDate(now).slice(0, 7);
    const caMois = factures.filter(f => f.statut === 'payee' && (f.payeeLe || '').startsWith(month))
      .reduce((t, f) => t + Store.invoiceTotal(f), 0);
    const hour = now.getHours();
    const hello = hour < 18 ? 'Bonjour' : 'Bonsoir';
    const named = s.nom && s.nom !== DEFAULT_SETTINGS.nom;

    const eventRow = (e) => {
      if (e.type === 'perso') return `
        <li class="row perso" data-ev="${e.id}">
          <span class="time">${U.fmtTime(e.start)}</span>
          <span class="grow"><strong>${U.esc(e.title)}</strong> <span class="muted">· personnel</span></span>
        </li>`;
      const past = new Date(e.start) < now;
      return `
        <li class="row" data-ev="${e.id}">
          <span class="time">${U.fmtTime(e.start)}</span>
          <span class="grow">
            <strong>${U.esc(Store.clientName(e.clientId))}</strong>
            <span class="muted">· ${e.mode === 'visio' ? 'Visio' : 'Cabinet'} · ${e.duree} min</span>
            ${UI.badge(e.statut)}
          </span>
          <span class="row-actions">
            ${e.mode === 'visio' && e.visioUrl ? `<a class="btn small primary" href="${U.esc(e.visioUrl)}" target="_blank" rel="noopener" data-stop>${icon('video', 16)} Rejoindre</a>` : ''}
            ${e.statut === 'prevu' && past ? `<button class="btn small ghost" data-honore="${e.id}">${icon('check', 16)} Honoré</button>` : ''}
            ${e.statut === 'honore' && !e.factureId ? `<button class="btn small ghost" data-facturer="${e.id}">${icon('invoice', 16)} Facturer</button>` : ''}
          </span>
        </li>`;
    };

    el.innerHTML = `
      <div class="page-head">
        <div>
          <h1>${hello}${named ? ' ' + U.esc(s.nom.split(' ')[0]) : ''} 👋</h1>
          <p class="muted">${U.fmtDateLong(now)}${named ? '' : ' · <a href="#/parametres">Renseignez votre nom et votre cabinet</a>'}</p>
        </div>
        <div class="head-actions">
          <button class="btn primary" data-new-rdv>${icon('plus', 18)} Nouveau rendez-vous</button>
        </div>
      </div>

      <div class="stats">
        <a class="stat" href="#/agenda"><span class="stat-ico">${icon('calendar')}</span><span><b>${todays.filter(e => e.type === 'rdv' && e.statut !== 'annule').length}</b> rendez-vous aujourd'hui</span></a>
        <a class="stat" href="#/factures"><span class="stat-ico warn">${icon('bell')}</span><span><b>${retard.length}</b> facture${retard.length > 1 ? 's' : ''} en retard</span></a>
        <a class="stat" href="#/factures"><span class="stat-ico">${icon('invoice')}</span><span><b>${U.fmtMoney(enAttente.reduce((t, f) => t + Store.invoiceTotal(f), 0))}</b> à encaisser</span></a>
        <a class="stat" href="#/compta"><span class="stat-ico ok">${icon('euro')}</span><span><b>${U.fmtMoney(caMois)}</b> encaissés en ${U.monthName(now.getMonth())}</span></a>
      </div>

      <div class="cols">
        <section class="card">
          <h2>${icon('clock')} Aujourd'hui</h2>
          ${todays.length ? `<ul class="list">${todays.map(eventRow).join('')}</ul>` : UI.empty('Aucun rendez-vous aujourd\'hui. Profitez-en !')}
        </section>

        <div class="stack">
          ${demandes.length ? `
          <section class="card highlight">
            <h2>${icon('globe')} Demandes de rendez-vous <span class="count">${demandes.length}</span></h2>
            <ul class="list">${demandes.map(d => `
              <li class="row wrap">
                <span class="grow">
                  <strong>${U.esc(d.prenom)} ${U.esc(d.nom)}</strong>
                  <span class="muted">· ${U.fmtDate(d.start)} à ${U.fmtTime(d.start)} · ${d.mode === 'visio' ? 'Visio' : 'Cabinet'}</span>
                  ${d.motif ? `<br><span class="muted small">« ${U.esc(d.motif)} »</span>` : ''}
                </span>
                <span class="row-actions">
                  <button class="btn small ghost" data-refuse="${d.id}">Refuser</button>
                  <button class="btn small primary" data-accept="${d.id}">${icon('check', 16)} Accepter</button>
                </span>
              </li>`).join('')}</ul>
          </section>` : ''}

          <section class="card">
            <h2>${icon('whatsapp')} Rappels à envoyer <span class="muted small">(3 prochains jours)</span></h2>
            ${tomorrow.length ? `<ul class="list">${tomorrow.map(e => `
              <li class="row">
                <span class="time">${U.fmtTime(e.start)}</span>
                <span class="grow"><strong>${U.esc(Store.clientName(e.clientId))}</strong> <span class="muted">· ${U.fmtDate(e.start)}</span>
                  ${e.rappelEnvoye ? '<span class="badge badge-green">Rappel envoyé</span>' : ''}</span>
                <button class="btn small whatsapp" data-remind="${e.id}">${icon('whatsapp', 16)} ${e.rappelEnvoye ? 'Renvoyer' : 'Envoyer'}</button>
              </li>`).join('')}</ul>` : UI.empty('Aucun rendez-vous dans les 3 prochains jours.')}
          </section>

          <section class="card">
            <h2>${icon('bell')} À faire</h2>
            ${(retard.length || aFacturer.length) ? `<ul class="list">
              ${retard.map(f => `
                <li class="row">
                  <span class="grow">Facture <strong>${U.esc(f.numero)}</strong> · ${U.esc(Store.clientName(f.clientId))}
                    <span class="muted">· ${U.fmtMoney(Store.invoiceTotal(f))} · échue le ${U.fmtDateShort(f.echeance)}</span></span>
                  <button class="btn small ghost" data-relance="${f.id}">${icon('bell', 16)} Relancer</button>
                </li>`).join('')}
              ${aFacturer.map(e => `
                <li class="row">
                  <span class="grow">Séance non facturée · <strong>${U.esc(Store.clientName(e.clientId))}</strong>
                    <span class="muted">· ${U.fmtDate(e.start)}</span></span>
                  <button class="btn small ghost" data-facturer="${e.id}">${icon('invoice', 16)} Facturer</button>
                </li>`).join('')}
            </ul>` : UI.empty('Tout est à jour ✔')}
          </section>
        </div>
      </div>`;

    el.querySelector('[data-new-rdv]').onclick = () => Actions.openEvent();
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-honore],[data-facturer],[data-accept],[data-refuse],[data-remind],[data-relance],[data-stop],[data-ev]');
      if (!t) return;
      if (t.dataset.stop !== undefined) return;
      if (t.dataset.honore) return Actions.setEventStatus(t.dataset.honore, 'honore');
      if (t.dataset.facturer) return Actions.invoiceFromEvent(t.dataset.facturer);
      if (t.dataset.accept) return Actions.acceptDemande(t.dataset.accept);
      if (t.dataset.refuse) return Actions.refuseDemande(t.dataset.refuse);
      if (t.dataset.remind) return Actions.sendReminder(t.dataset.remind);
      if (t.dataset.relance) return Actions.relance(t.dataset.relance);
      if (t.dataset.ev) return Actions.openEvent({ id: t.dataset.ev });
    });
  },
};
