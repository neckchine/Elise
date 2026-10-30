/* Page de prise de rendez-vous en ligne, telle que la voient les clients. */
Views.reservation = {
  title: 'Prise de RDV en ligne',
  selected: null, // créneau choisi (ISO)
  dayIndex: 0,

  render(el, { publicMode = false } = {}) {
    const s = Store.settings;
    const days = [];
    for (let i = 0, d = U.startOfDay(new Date()); days.length < 14 && i < 60; i++, d = U.addDays(d, 1)) {
      const slots = Store.freeSlots(U.isoDate(d));
      if (slots.length) days.push({ date: d, slots });
    }
    this.dayIndex = Math.min(this.dayIndex, Math.max(0, days.length - 1));
    const cur = days[this.dayIndex];
    const publicUrl = location.href.split('#')[0] + '#/reserver';

    el.innerHTML = `
      ${publicMode ? '' : `
      <div class="page-head">
        <div><h1>Prise de rendez-vous en ligne</h1>
          <p class="muted">Voici la page que vos clients voient. Les créneaux proposés suivent vos horaires (Paramètres) et votre agenda.</p></div>
        <div class="head-actions">
          <button class="btn ghost" data-copy>${icon('globe', 18)} Copier le lien</button>
          <a class="btn primary" href="#/reserver" target="_blank">Ouvrir la page client</a>
        </div>
      </div>
      ${CalCom.conf().lien ? `<section class="card cal-card">
        <h2>Votre page Cal.com</h2>
        <p>Vos clients peuvent aussi réserver sur Cal.com. Ces réservations arrivent dans l'agenda${CalCom.connected() ? '' : ' une fois la clé API renseignée dans les Paramètres'}.</p>
        <p class="link-box">${U.esc(CalCom.conf().lien)}</p>
        <div class="btn-row"><button class="btn ghost" data-copy-cal>Copier le lien</button>
          <a class="btn ghost" href="${U.esc(CalCom.conf().lien)}" target="_blank" rel="noopener">Ouvrir Cal.com</a></div>
      </section>` : `<p class="hint">Vous utilisez Cal.com ? <a href="#/parametres">Connectez-le dans les Paramètres</a> pour recevoir ces réservations dans l'agenda.</p>`}`}

      <div class="booking card">
        <div class="booking-head">
          <div class="avatar big">${U.esc(s.nom.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase())}</div>
          <div>
            <h2>${U.esc(s.nom)}</h2>
            <p class="muted">${U.esc(s.profession)} · ${U.esc(s.adresse.replace(/\n/g, ', '))}</p>
            <p class="muted">Séance de ${s.duree} min · ${U.fmtMoney(s.tarif)} · au cabinet ou en visio</p>
          </div>
        </div>

        <h3>1. Choisissez un jour</h3>
        ${days.length ? `
          <div class="day-pills">${days.map((d, i) => `
            <button class="pill ${i === this.dayIndex ? 'active' : ''}" data-day="${i}">
              <span>${U.fmtDate(d.date, { weekday: 'short' })}</span><b>${d.date.getDate()}</b><span>${U.fmtDate(d.date, { month: 'short' })}</span>
            </button>`).join('')}</div>
          <h3>2. Choisissez un horaire</h3>
          <div class="slots">${cur.slots.map(t => `
            <button class="slot ${this.selected === t.toISOString() ? 'active' : ''}" data-slot="${t.toISOString()}">${U.fmtTime(t)}</button>`).join('')}</div>
        ` : UI.empty('Aucun créneau disponible pour le moment.')}

        <form class="form booking-form" id="book-form" ${this.selected ? '' : 'hidden'}>
          <h3>3. Vos coordonnées</h3>
          <p class="notice">Créneau choisi : <strong>${this.selected ? `${U.fmtDateLong(this.selected)} à ${U.fmtTime(this.selected)}` : ''}</strong></p>
          <div class="grid2">
            <label class="field"><span>Prénom</span><input name="prenom" required></label>
            <label class="field"><span>Nom</span><input name="nom" required></label>
            <label class="field"><span>Téléphone</span><input name="tel" type="tel" required placeholder="06 12 34 56 78"></label>
            <label class="field"><span>E-mail</span><input name="email" type="email" required></label>
          </div>
          <div class="segmented">
            <label><input type="radio" name="mode" value="cabinet" checked><span>Au cabinet</span></label>
            <label><input type="radio" name="mode" value="visio"><span>En visio</span></label>
          </div>
          <label class="field"><span>Motif (facultatif)</span><textarea name="motif" rows="2" placeholder="Quelques mots si vous le souhaitez"></textarea></label>
          <label class="check"><input type="checkbox" name="rgpd" required> J'accepte que mes coordonnées soient utilisées uniquement pour la gestion de mes rendez-vous.</label>
          <button class="btn primary big" type="submit">${icon('check', 18)} Demander ce rendez-vous</button>
        </form>
      </div>`;

    el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { this.dayIndex = Number(b.dataset.day); this.selected = null; this.render(el, { publicMode }); });
    el.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
      this.selected = b.dataset.slot; this.render(el, { publicMode });
      el.querySelector('#book-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    el.querySelector('[data-copy-cal]')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(CalCom.conf().lien).then(() => UI.toast('Lien copié'), () => UI.toast(CalCom.conf().lien));
    });
    el.querySelector('[data-copy]')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(publicUrl).then(() => UI.toast('Lien copié'), () => UI.toast(publicUrl));
    });
    el.querySelector('#book-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = U.form(e.target);
      Store.upsert('demandes', { ...v, start: this.selected, statut: 'attente', createdAt: new Date().toISOString() });
      const when = `${U.fmtDateLong(this.selected)} à ${U.fmtTime(this.selected)}`;
      this.selected = null;
      el.querySelector('.booking').innerHTML = `
        <div class="success">
          <div class="success-ico">${icon('check', 40)}</div>
          <h2>Merci ${U.esc(v.prenom)} !</h2>
          <p>Votre demande pour le <strong>${U.esc(when)}</strong> a bien été envoyée.</p>
          <p class="muted">Vous recevrez une confirmation par WhatsApp ou e-mail.</p>
          ${publicMode ? '' : '<p><a class="btn ghost" href="#/">Voir la demande sur l\'accueil</a></p>'}
        </div>`;
    });
  },
};
