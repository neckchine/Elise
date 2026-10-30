/* Écran d'accueil : la feuille de route de la journée et ce qui attend une action. */
Views.dashboard = {
  title: 'Accueil',

  render(el) {
    const s = Store.settings;
    const now = new Date();
    const today = U.startOfDay(now);
    const todays = Store.eventsBetween(today, U.addDays(today, 1));
    const seances = todays.filter(e => e.type === 'rdv' && e.statut !== 'annule');
    const rappels = Store.eventsBetween(U.addDays(today, 1), U.addDays(today, 4))
      .filter(e => e.type === 'rdv' && e.statut === 'prevu');
    const demandes = Store.list('demandes').filter(d => d.statut === 'attente');
    const factures = Store.list('factures');
    const retard = factures.filter(f => Store.invoiceStatus(f) === 'retard');
    const enAttente = factures.filter(f => ['envoyee', 'retard'].includes(Store.invoiceStatus(f)));
    const aFacturer = Store.list('events').filter(e => e.type === 'rdv' && e.statut === 'honore' && !e.factureId);
    const month = U.isoDate(now).slice(0, 7);
    const caMois = factures.filter(f => f.statut === 'payee' && (f.payeeLe || '').startsWith(month))
      .reduce((t, f) => t + Store.invoiceTotal(f), 0);
    const named = s.nom && s.nom !== DEFAULT_SETTINGS.nom;
    const sum = (arr) => arr.reduce((t, f) => t + Store.invoiceTotal(f), 0);

    el.innerHTML = `
      <header class="day-head">
        <div class="day-date">
          <span class="day-weekday">${U.fmtDate(now, { weekday: 'long' })}</span>
          <span class="day-num">${now.getDate()}</span>
          <span class="day-month">${U.fmtDate(now, { month: 'long', year: 'numeric' })}</span>
        </div>
        <dl class="ledger">
          <div><dt>Séances aujourd'hui</dt><dd>${seances.length}</dd></div>
          <div><dt>Encaissé en ${U.monthName(now.getMonth())}</dt><dd>${U.fmtMoney(caMois)}</dd></div>
          <div><dt>À encaisser</dt><dd>${U.fmtMoney(sum(enAttente))}</dd></div>
          <div class="${retard.length ? 'is-late' : ''}"><dt>En retard</dt><dd>${U.fmtMoney(sum(retard))}</dd></div>
        </dl>
        <button class="btn primary" data-new-rdv>${icon('plus', 18)} Nouveau rendez-vous</button>
      </header>

      ${named ? '' : `<p class="setup-hint">Première visite ? <a href="#/parametres">Indiquez votre nom, votre adresse et vos tarifs</a> : ils apparaîtront sur vos factures et votre page de réservation.</p>`}

      <div class="dash">
        <section class="sheet">
          <h2>Programme du jour</h2>
          ${this.timeline(todays, now)}
        </section>

        <aside class="inbox">
          ${demandes.length ? `
          <section class="inbox-group is-marked">
            <h2>Demandes en ligne <span class="count">${demandes.length}</span></h2>
            <ul class="list">${demandes.map(d => `
              <li class="row wrap">
                <span class="grow">
                  <strong>${U.esc(d.prenom)} ${U.esc(d.nom)}</strong>
                  <span class="meta">${U.fmtDate(d.start)} à ${U.fmtTime(d.start)} · ${d.mode === 'visio' ? 'visio' : 'cabinet'}</span>
                  ${d.motif ? `<span class="excerpt">${U.esc(d.motif)}</span>` : ''}
                </span>
                <span class="row-actions">
                  <button class="btn small ghost" data-refuse="${d.id}">Refuser</button>
                  <button class="btn small primary" data-accept="${d.id}">Accepter</button>
                </span>
              </li>`).join('')}</ul>
          </section>` : ''}

          ${rappels.length ? `
          <section class="inbox-group">
            <h2>Rappels à envoyer <span class="count">${rappels.filter(e => !e.rappelEnvoye).length}</span></h2>
            <ul class="list">${rappels.map(e => `
              <li class="row">
                <span class="grow"><strong>${U.esc(Store.clientName(e.clientId))}</strong>
                  <span class="meta">${U.fmtDate(e.start)} · ${U.fmtTime(e.start)}${e.rappelEnvoye ? ' · rappel envoyé' : ''}</span></span>
                <button class="btn small ${e.rappelEnvoye ? 'ghost' : 'whatsapp'}" data-remind="${e.id}">${icon('whatsapp', 16)} ${e.rappelEnvoye ? 'Renvoyer' : 'Rappeler'}</button>
              </li>`).join('')}</ul>
          </section>` : ''}

          ${retard.length ? `
          <section class="inbox-group">
            <h2>Factures en retard <span class="count">${retard.length}</span></h2>
            <ul class="list">${retard.map(f => `
              <li class="row">
                <span class="grow"><strong>${U.esc(Store.clientName(f.clientId))}</strong>
                  <span class="meta">n° ${U.esc(f.numero)} · ${U.fmtMoney(Store.invoiceTotal(f))} · échue le ${U.fmtDateShort(f.echeance)}${f.relances?.length ? ` · ${f.relances.length} relance(s)` : ''}</span></span>
                <button class="btn small ghost" data-relance="${f.id}">Relancer</button>
              </li>`).join('')}</ul>
          </section>` : ''}

          ${aFacturer.length ? `
          <section class="inbox-group">
            <h2>Séances à facturer <span class="count">${aFacturer.length}</span></h2>
            <ul class="list">${aFacturer.map(e => `
              <li class="row">
                <span class="grow"><strong>${U.esc(Store.clientName(e.clientId))}</strong>
                  <span class="meta">${U.fmtDate(e.start)} · ${U.fmtMoney(e.tarif)}</span></span>
                <button class="btn small ghost" data-facturer="${e.id}">Facturer</button>
              </li>`).join('')}</ul>
          </section>` : ''}

          ${!demandes.length && !rappels.length && !retard.length && !aFacturer.length
            ? `<section class="inbox-group"><h2>À traiter</h2><p class="muted">Rien en attente. Tout est à jour.</p></section>` : ''}
        </aside>
      </div>`;

    el.querySelector('[data-new-rdv]').onclick = () => Actions.openEvent();
    el.addEventListener('click', (e) => {
      const t = e.target.closest('[data-honore],[data-facturer],[data-accept],[data-refuse],[data-remind],[data-relance],[data-stop],[data-ev],[data-free]');
      if (!t) return;
      if (t.dataset.stop !== undefined) return;
      if (t.dataset.honore) return Actions.setEventStatus(t.dataset.honore, 'honore');
      if (t.dataset.facturer) return Actions.invoiceFromEvent(t.dataset.facturer);
      if (t.dataset.accept) return Actions.acceptDemande(t.dataset.accept);
      if (t.dataset.refuse) return Actions.refuseDemande(t.dataset.refuse);
      if (t.dataset.remind) return Actions.sendReminder(t.dataset.remind);
      if (t.dataset.relance) return Actions.relance(t.dataset.relance);
      if (t.dataset.free) return Actions.openEvent({ start: t.dataset.free });
      if (t.dataset.ev) return Actions.openEvent({ id: t.dataset.ev });
    });
  },

  // Liste horaire de la journée, avec les créneaux libres entre deux rendez-vous
  timeline(events, now) {
    const h = Store.settings.horaires[now.getDay()];
    const day = U.isoDate(now);
    const open = h?.ouvert ? new Date(U.fromDateTime(day, h.debut)) : null;
    const close = h?.ouvert ? new Date(U.fromDateTime(day, h.fin)) : null;
    const active = events.filter(e => e.statut !== 'annule');
    if (!events.length) {
      return `<p class="sheet-empty">${h?.ouvert ? `Aucun rendez-vous. Le cabinet est ouvert de ${h.debut.replace(':', 'h')} à ${h.fin.replace(':', 'h')}.` : 'Jour de fermeture.'}</p>
        ${h?.ouvert ? `<button class="btn ghost" data-free="${open.toISOString()}">Ajouter un rendez-vous</button>` : ''}`;
    }

    const items = [];
    let cursor = open;
    const gap = (from, to) => {
      const min = Math.round((to - from) / 60000);
      if (min < 30) return;
      const dur = min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ' ' + U.pad(min % 60) : ''}` : `${min} min`;
      items.push(`<li class="slot-free"><button data-free="${from.toISOString()}"><span class="t">${U.fmtTime(from)}</span><span>Libre · ${dur}</span><span class="add">${icon('plus', 16)}</span></button></li>`);
    };

    for (const e of events) {
      const start = new Date(e.start), end = new Date(start.getTime() + e.duree * 60000);
      if (cursor && e.statut !== 'annule' && start > cursor) gap(cursor, start);
      const past = end < now, current = start <= now && end > now;
      if (e.type === 'perso') {
        items.push(`<li class="entry is-perso" data-ev="${e.id}">
          <span class="t">${U.fmtTime(e.start)}</span>
          <span class="grow"><strong>${U.esc(e.title)}</strong><span class="meta">Personnel · ${e.duree} min</span></span></li>`);
      } else {
        items.push(`<li class="entry ${past ? 'is-past' : ''} ${current ? 'is-now' : ''} ${e.statut === 'annule' ? 'is-cancel' : ''}" data-ev="${e.id}">
          <span class="t">${U.fmtTime(e.start)}</span>
          <span class="grow">
            <strong>${U.esc(Store.clientName(e.clientId))}</strong>
            <span class="meta">${e.mode === 'visio' ? 'Visio' : 'Cabinet'} · ${e.duree} min · ${UI.badge(e.statut)}</span>
          </span>
          <span class="row-actions">
            ${e.mode === 'visio' && e.visioUrl && e.statut === 'prevu' ? `<a class="btn small ${current ? 'primary' : 'ghost'}" href="${U.esc(e.visioUrl)}" target="_blank" rel="noopener" data-stop>${icon('video', 16)} Rejoindre</a>` : ''}
            ${e.statut === 'prevu' && start < now ? `<button class="btn small ghost" data-honore="${e.id}">Séance faite</button>` : ''}
            ${e.statut === 'honore' && !e.factureId ? `<button class="btn small ghost" data-facturer="${e.id}">Facturer</button>` : ''}
          </span>
        </li>`);
      }
      if (e.statut !== 'annule' && (!cursor || end > cursor)) cursor = end;
    }
    if (close && cursor && close > cursor) gap(cursor, close);
    if (close) items.push(`<li class="day-end"><span class="t">${U.fmtTime(close)}</span><span>Fin de journée · ${active.filter(e => e.type === 'rdv').length} séance(s)</span></li>`);
    return `<ol class="timeline">${items.join('')}</ol>`;
  },
};
