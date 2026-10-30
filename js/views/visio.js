/* Visio : séances à distance à venir, lien instantané. */
Views.visio = {
  title: 'Visio',

  render(el) {
    const now = Date.now();
    const list = Store.list('events')
      .filter(e => e.type === 'rdv' && e.mode === 'visio' && e.statut === 'prevu' && new Date(e.start).getTime() + e.duree * 60000 > now)
      .sort((a, b) => a.start.localeCompare(b.start));

    el.innerHTML = `
      <div class="page-head">
        <div><h1>Séances en visio</h1>
          <p class="muted">Chaque rendez-vous en visio reçoit son propre lien sécurisé. Votre client clique sur le lien reçu par WhatsApp, sans rien installer.</p></div>
        <div class="head-actions"><button class="btn primary" data-instant>${icon('video', 18)} Visio immédiate</button></div>
      </div>

      <section class="card">
        <h2>Prochaines séances en visio</h2>
        ${list.length ? `<ul class="list">${list.map(e => {
          const soon = new Date(e.start).getTime() - now < 15 * 60000;
          return `<li class="row wrap">
            <span class="time">${U.fmtDate(e.start, { day: 'numeric', month: 'short' })}<br>${U.fmtTime(e.start)}</span>
            <span class="grow"><strong>${U.esc(Store.clientName(e.clientId))}</strong><br>
              <span class="muted small">${U.esc(e.visioUrl || '')}</span></span>
            <span class="row-actions">
              <button class="btn small ghost" data-send="${e.id}">${icon('whatsapp', 16)} Envoyer le lien</button>
              <a class="btn small ${soon ? 'primary' : 'ghost'}" href="${U.esc(e.visioUrl)}" target="_blank" rel="noopener">${icon('video', 16)} Rejoindre</a>
            </span></li>`;
        }).join('')}</ul>` : UI.empty('Aucune séance en visio prévue. Choisissez « En visio » dans un rendez-vous.')}
      </section>

      <section class="card">
        <h2>Et les appels vidéo WhatsApp ?</h2>
        <p>Vous pouvez aussi faire la séance directement par appel vidéo WhatsApp depuis votre téléphone :
          envoyez le rappel depuis l'agenda, puis appelez votre client à l'heure prévue. WhatsApp ne permet pas de lancer
          un appel vidéo depuis un site web, c'est pourquoi l'application vous propose en plus un lien de visio qui
          fonctionne sur ordinateur, tablette et téléphone.</p>
        <p class="muted small">Service de visio utilisé : ${U.esc(Store.settings.visioBase)} (modifiable dans les Paramètres).</p>
      </section>`;

    el.querySelectorAll('[data-send]').forEach(b => b.onclick = () => Actions.sendVisio(b.dataset.send));
    el.querySelector('[data-instant]').onclick = () => {
      const link = Store.visioLink();
      UI.modal({
        title: 'Visio immédiate',
        body: `<p>Votre salle de visio est prête :</p>
          <p class="link-box">${U.esc(link)}</p>
          <label class="field"><span>Envoyer le lien à</span><select name="c">${UI.clientOptions('')}</select></label>`,
        footer: `<button class="btn ghost" data-wa>${icon('whatsapp', 18)} Envoyer par WhatsApp</button>
          <a class="btn primary" href="${U.esc(link)}" target="_blank" rel="noopener">${icon('video', 18)} Ouvrir la visio</a>`,
        onMount(m, api) {
          m.querySelector('[data-wa]').onclick = () => {
            const id = m.querySelector('select').value;
            if (!id) return UI.toast('Choisissez un client', 'warn');
            const c = Store.get('clients', id);
            Actions.whatsapp(id, `Bonjour ${c.prenom}, voici le lien pour notre visio : ${link}`, 'visio');
          };
        },
      });
    };
  },
};
