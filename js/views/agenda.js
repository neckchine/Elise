/* Agenda semaine / jour : rendez-vous clients et événements personnels. */
Views.agenda = {
  title: 'Agenda',
  date: new Date(),
  mode: window.innerWidth < 760 ? 'jour' : 'semaine',
  H0: 7, H1: 21, PX: 56, // heures affichées et hauteur d'une heure en pixels

  render(el) {
    const { H0, H1, PX } = this;
    const days = this.mode === 'semaine'
      ? Array.from({ length: 7 }, (_, i) => U.addDays(U.startOfWeek(this.date), i))
      : [U.startOfDay(this.date)];
    const first = days[0], last = days[days.length - 1];
    const label = this.mode === 'semaine'
      ? `${U.fmtDate(first, { day: 'numeric', month: 'short' })} – ${U.fmtDate(last, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : U.fmtDateLong(first);
    const events = Store.eventsBetween(first, U.addDays(last, 1));
    const demandes = Store.list('demandes').filter(d => d.statut === 'attente');
    const horaires = Store.settings.horaires;
    const toY = (d) => ((d.getHours() + d.getMinutes() / 60) - H0) * PX;

    const dayCol = (day) => {
      const h = horaires[day.getDay()];
      const evs = events.filter(e => U.sameDay(e.start, day));
      // Répartit les événements qui se chevauchent sur plusieurs colonnes
      const lanes = [];
      const placed = evs.map(e => {
        const s = new Date(e.start).getTime(), end = s + e.duree * 60000;
        let lane = lanes.findIndex(l => l <= s);
        if (lane < 0) { lane = lanes.length; lanes.push(end); } else lanes[lane] = end;
        return { e, lane };
      });
      const n = Math.max(1, lanes.length);
      const closed = !h?.ouvert ? `<div class="closed" style="top:0;height:${(H1 - H0) * PX}px"></div>` : (() => {
        const [dh, dm] = h.debut.split(':').map(Number), [fh, fm] = h.fin.split(':').map(Number);
        const a = (dh + dm / 60 - H0) * PX, b = (fh + fm / 60 - H0) * PX;
        return `<div class="closed" style="top:0;height:${Math.max(0, a)}px"></div>
                <div class="closed" style="top:${b}px;height:${Math.max(0, (H1 - H0) * PX - b)}px"></div>`;
      })();
      const now = new Date();
      const nowLine = U.sameDay(now, day) && now.getHours() >= H0 && now.getHours() < H1
        ? `<div class="now-line" style="top:${toY(now)}px"></div>` : '';

      return `
        <div class="day-col" data-day="${U.isoDate(day)}" style="height:${(H1 - H0) * PX}px">
          ${closed}
          ${Array.from({ length: H1 - H0 }, (_, i) => `<div class="hour-line" style="top:${i * PX}px"></div>`).join('')}
          ${placed.map(({ e, lane }) => {
            const d = new Date(e.start);
            const top = toY(d), height = Math.max(22, e.duree / 60 * PX - 2);
            const cls = e.type === 'perso' ? 'perso' : `rdv st-${e.statut} ${e.mode === 'visio' ? 'visio' : ''}`;
            const name = e.type === 'perso' ? e.title : Store.clientName(e.clientId);
            return `<button class="evt ${cls}" data-ev="${e.id}"
                style="top:${top}px;height:${height}px;left:calc(${lane / n * 100}% + 2px);width:calc(${100 / n}% - 4px)">
                <span class="evt-time">${U.fmtTime(e.start)}${e.mode === 'visio' ? ' · visio' : ''}${e.source === 'calcom' ? ' · Cal.com' : ''}</span>
                <span class="evt-title">${U.esc(name)}</span>
              </button>`;
          }).join('')}
          ${demandes.filter(d => U.sameDay(d.start, day)).map(d => `
            <button class="evt demande" data-dem="${d.id}" style="top:${toY(new Date(d.start))}px;height:${Store.settings.duree / 60 * PX - 2}px;left:2px;right:2px">
              <span class="evt-time">${U.fmtTime(d.start)} · demande</span>
              <span class="evt-title">${U.esc(d.prenom)} ${U.esc(d.nom)}</span>
            </button>`).join('')}
          ${nowLine}
        </div>`;
    };

    el.innerHTML = `
      <div class="page-head">
        <div class="agenda-nav">
          <button class="icon-btn" data-prev aria-label="Précédent">${icon('left')}</button>
          <button class="btn ghost small" data-today>Aujourd'hui</button>
          <button class="icon-btn" data-next aria-label="Suivant">${icon('right')}</button>
          <h1 class="agenda-label">${U.esc(label)}</h1>
        </div>
        <div class="head-actions">
          <div class="segmented small">
            <label><input type="radio" name="mode" value="jour" ${this.mode === 'jour' ? 'checked' : ''}><span>Jour</span></label>
            <label><input type="radio" name="mode" value="semaine" ${this.mode === 'semaine' ? 'checked' : ''}><span>Semaine</span></label>
          </div>
          ${CalCom.connected() ? `<button class="btn ghost" data-calsync title="${U.esc(CalCom.statusText())}">Synchroniser Cal.com</button>` : ''}
          <button class="btn ghost" data-perso>${icon('plus', 18)} Perso</button>
          <button class="btn primary" data-new>${icon('plus', 18)} Rendez-vous</button>
        </div>
      </div>

      <div class="legend">
        <span><i class="dot rdv"></i>Rendez-vous client</span>
        <span><i class="dot visio"></i>Visio</span>
        <span><i class="dot perso"></i>Personnel</span>
        <span><i class="dot demande"></i>Demande en ligne à valider</span>
        <span class="muted">Astuce : cliquez sur un créneau vide pour ajouter un rendez-vous.</span>
      </div>

      <div class="cal card">
        <div class="cal-head" style="grid-template-columns:52px repeat(${days.length},1fr)">
          <div></div>
          ${days.map(d => `<div class="cal-day ${U.sameDay(d, new Date()) ? 'is-today' : ''}" data-goto="${U.isoDate(d)}">
            <span>${U.fmtDate(d, { weekday: 'short' })}</span><b>${d.getDate()}</b></div>`).join('')}
        </div>
        <div class="cal-body" style="grid-template-columns:52px repeat(${days.length},1fr)">
          <div class="hours">${Array.from({ length: H1 - H0 }, (_, i) => `<div style="height:${PX}px">${H0 + i}h</div>`).join('')}</div>
          ${days.map(dayCol).join('')}
        </div>
      </div>`;

    const step = this.mode === 'semaine' ? 7 : 1;
    el.querySelector('[data-prev]').onclick = () => { this.date = U.addDays(this.date, -step); App.refresh(); };
    el.querySelector('[data-next]').onclick = () => { this.date = U.addDays(this.date, step); App.refresh(); };
    el.querySelector('[data-today]').onclick = () => { this.date = new Date(); App.refresh(); };
    el.querySelectorAll('[name=mode]').forEach(r => r.onchange = () => { this.mode = r.value; App.refresh(); });
    el.querySelector('[data-calsync]')?.addEventListener('click', () => CalCom.sync());
    el.querySelector('[data-new]').onclick = () => Actions.openEvent({ start: U.fromDateTime(U.isoDate(this.date), '10:00') });
    el.querySelector('[data-perso]').onclick = () => Actions.openEvent({ type: 'perso', start: U.fromDateTime(U.isoDate(this.date), '12:00'), duree: 60 });
    el.querySelectorAll('[data-goto]').forEach(n => n.onclick = () => { this.date = new Date(n.dataset.goto + 'T00:00'); this.mode = 'jour'; App.refresh(); });

    el.querySelector('.cal-body').addEventListener('click', (e) => {
      const evt = e.target.closest('[data-ev]');
      if (evt) return Actions.openEvent({ id: evt.dataset.ev });
      const dem = e.target.closest('[data-dem]');
      if (dem) return this.openDemande(dem.dataset.dem);
      const col = e.target.closest('.day-col');
      if (!col) return;
      const y = e.clientY - col.getBoundingClientRect().top;
      const minutes = Math.round((y / PX * 60) / 15) * 15 + H0 * 60;
      const time = `${U.pad(Math.floor(minutes / 60))}:${U.pad(minutes % 60)}`;
      Actions.openEvent({ start: U.fromDateTime(col.dataset.day, time) });
    });

    // Fait défiler jusqu'à 8h
    const body = el.querySelector('.cal-body');
    body.scrollTop = (8 - H0) * PX;
  },

  openDemande(id) {
    const d = Store.get('demandes', id);
    UI.modal({
      title: 'Demande de rendez-vous',
      body: `<p><strong>${U.esc(d.prenom)} ${U.esc(d.nom)}</strong></p>
        <p>${U.fmtDateLong(d.start)} à ${U.fmtTime(d.start)} · ${d.mode === 'visio' ? 'En visio' : 'Au cabinet'}</p>
        <p class="muted">${U.esc(d.tel)} · ${U.esc(d.email)}</p>
        ${d.motif ? `<p class="quote">${U.esc(d.motif)}</p>` : ''}`,
      footer: `<button class="btn ghost" data-no>Refuser</button><button class="btn primary" data-yes>${icon('check', 18)} Accepter</button>`,
      onMount(el, api) {
        el.querySelector('[data-no]').onclick = () => { api.close(); Actions.refuseDemande(id); };
        el.querySelector('[data-yes]').onclick = () => { api.close(); Actions.acceptDemande(id); };
      },
    });
  },
};
