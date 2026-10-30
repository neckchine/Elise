/* Paramètres du cabinet, horaires et sauvegarde des données. */
const JOURS = [[1, 'Lundi'], [2, 'Mardi'], [3, 'Mercredi'], [4, 'Jeudi'], [5, 'Vendredi'], [6, 'Samedi'], [0, 'Dimanche']];

Views.parametres = {
  title: 'Paramètres',

  render(el) {
    const s = Store.settings;
    el.innerHTML = `
      <div class="page-head"><div><h1>Paramètres</h1><p class="muted">Ces informations apparaissent sur vos factures, courriers et votre page de réservation.</p></div></div>
      <form class="form" id="set-form">
        <div class="cols">
          <section class="card">
            <h2>Mon cabinet</h2>
            <div class="grid2">
              <label class="field"><span>Nom affiché</span><input name="nom" value="${U.esc(s.nom)}"></label>
              <label class="field"><span>Profession</span><input name="profession" value="${U.esc(s.profession)}" list="professions"></label>
              <label class="field"><span>Téléphone</span><input name="tel" value="${U.esc(s.tel)}"></label>
              <label class="field"><span>E-mail</span><input name="email" type="email" value="${U.esc(s.email)}"></label>
            </div>
            <label class="field"><span>Adresse du cabinet</span><textarea name="adresse" rows="2">${U.esc(s.adresse)}</textarea></label>
            <div class="grid2">
              <label class="field"><span>SIRET</span><input name="siret" value="${U.esc(s.siret)}"></label>
              <label class="field"><span>N° ADELI / RPPS (si concerné)</span><input name="adeli" value="${U.esc(s.adeli)}"></label>
            </div>
            <label class="field"><span>Site internet (facultatif)</span><input name="site" value="${U.esc(s.site || '')}" placeholder="www.mon-cabinet.fr"></label>
            <datalist id="professions">${['Psychologue', 'Psychothérapeute', 'Psychopraticien(ne)', 'Sophrologue', 'Naturopathe', 'Hypnothérapeute', 'Ostéopathe', 'Diététicien(ne)', 'Art-thérapeute', 'Coach', 'Thérapeute de couple'].map(p => `<option>${p}</option>`).join('')}</datalist>
          </section>

          <section class="card">
            <h2>Séances et facturation</h2>
            <div class="grid3">
              <label class="field"><span>Tarif par défaut (€)</span><input name="tarif" type="number" min="0" value="${s.tarif}"></label>
              <label class="field"><span>Durée (min)</span><input name="duree" type="number" min="10" step="5" value="${s.duree}"></label>
              <label class="field"><span>Délai de paiement (jours)</span><input name="delaiPaiement" type="number" min="0" value="${s.delaiPaiement}"></label>
            </div>
            <label class="field"><span>Mention TVA</span>
              <select name="mentionTVA">${[
                'TVA non applicable, article 261-4-1° du CGI',
                'TVA non applicable, article 293 B du CGI',
              ].map(m => `<option ${m === s.mentionTVA ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
            <p class="hint">261-4-1° : professions de santé réglementées (psychologues, psychothérapeutes, ostéopathes…). 293 B : franchise en base pour les autres activités (sophrologie, naturopathie, coaching…). En cas de doute, demandez à votre comptable.</p>
            <label class="field"><span>IBAN (affiché sur les factures)</span><input name="iban" value="${U.esc(s.iban)}" placeholder="FR76 …"></label>
            <div class="grid2">
              <label class="field"><span>Banque</span><input name="banque" value="${U.esc(s.banque || '')}" placeholder="Ex. : Qonto"></label>
              <label class="field"><span>BIC</span><input name="bic" value="${U.esc(s.bic || '')}"></label>
            </div>
            <label class="field"><span>Service de visio</span><input name="visioBase" value="${U.esc(s.visioBase)}"></label>
          </section>
        </div>

        <section class="card">
          <h2>Horaires de consultation</h2>
          <p class="muted">Utilisés pour proposer des créneaux sur votre page de prise de rendez-vous en ligne.</p>
          <div class="hours-grid">
            ${JOURS.map(([d, l]) => {
              const h = s.horaires[d];
              return `<div class="hours-row">
                <label class="check"><input type="checkbox" name="h${d}o" ${h.ouvert ? 'checked' : ''}> <strong>${l}</strong></label>
                <input type="time" name="h${d}d" value="${h.debut}" aria-label="${l} début"> à
                <input type="time" name="h${d}f" value="${h.fin}" aria-label="${l} fin">
              </div>`;
            }).join('')}
          </div>
        </section>

        <section class="card">
          <h2>Factures et courriers</h2>
          <div class="doc-settings">
            <label class="field color-field"><span>Couleur des documents</span>
              <span class="color-row"><input type="color" name="docColor" value="${U.esc(s.docColor || '#22427a')}">
                ${['#22427a', '#e8650f', '#2f6a47', '#7a3e6b', '#1f2430'].map(c => `<button type="button" class="swatch" data-swatch="${c}" style="background:${c}" aria-label="Couleur ${c}"></button>`).join('')}</span></label>
            <label class="field"><span>Mentions complémentaires (une par ligne)</span><textarea name="mentions" rows="3" placeholder="Ex. : Toute séance non annulée 48 h à l'avance est due.">${U.esc(s.mentions || '')}</textarea></label>
          </div>
          <button type="button" class="btn ghost" data-preview-invoice>Voir un exemple de facture</button>
        </section>

        <section class="card">
          <h2>Rappels automatiques</h2>
          <div class="reminder-settings">
            <label class="check"><input type="checkbox" name="ra_veille" ${s.rappelsAuto?.veille ? 'checked' : ''}> <strong>La veille</strong> <span class="muted">24 h avant la séance</span></label>
            <label class="check"><input type="checkbox" name="ra_h30" ${s.rappelsAuto?.h30 ? 'checked' : ''}> <strong>30 minutes avant</strong> <span class="muted">avec le lien de connexion pour les séances en visio</span></label>
          </div>
          <p class="hint">Au moment prévu, le rappel s'affiche en bas à droite de l'écran avec un bouton « Envoyer », sur l'ordinateur ou le téléphone où l'application est ouverte. Les textes se modifient dans l'écran WhatsApp, rubrique « Modèles de messages ».</p>
        </section>

        <div class="sticky-save"><button class="btn primary big" type="submit">${icon('check', 18)} Enregistrer les paramètres</button></div>
      </form>

      <section class="card" id="calcom">
        <h2>Cal.com <span class="st ${CalCom.conf().lastError ? 'st-red' : CalCom.connected() ? 'st-green' : 'st-grey'}">${U.esc(CalCom.connected() && !CalCom.conf().lastError ? 'Connecté' : CalCom.conf().lastError ? 'Erreur' : 'Non connecté')}</span></h2>
        <p>Les réservations faites sur votre page Cal.com arrivent automatiquement dans l'agenda, avec la fiche client. Les annulations et les changements d'horaire sont aussi repris.</p>
        <form class="form" id="cal-form">
          <div class="grid2">
            <label class="field"><span>Clé API Cal.com</span><input name="apiKey" type="password" autocomplete="off" value="${U.esc(CalCom.conf().apiKey || '')}" placeholder="cal_live_…"></label>
            <label class="field"><span>Lien de votre page de réservation</span><input name="lien" type="url" value="${U.esc(CalCom.conf().lien || '')}" placeholder="https://cal.com/votre-nom"></label>
          </div>
          <label class="check"><input type="checkbox" name="auto" ${CalCom.conf().auto !== false ? 'checked' : ''}> Synchroniser automatiquement toutes les 5 minutes</label>
          <p class="hint">Pour créer la clé : Cal.com → Paramètres → Développeur → Clés API → « Ajouter ». La clé reste enregistrée sur cet appareil uniquement.</p>
          <p class="cal-status ${CalCom.conf().lastError ? 'is-error' : ''}">${U.esc(CalCom.statusText())}</p>
          <div class="btn-row">
            <button class="btn primary" type="submit">Enregistrer et synchroniser</button>
            ${CalCom.connected() ? '<button class="btn ghost danger-text" type="button" data-cal-off>Déconnecter</button>' : ''}
          </div>
        </form>
      </section>

      <section class="card">
        <h2>Mes données</h2>
        <p>Vos données sont enregistrées <strong>uniquement sur cet appareil</strong>, dans ce navigateur. Pensez à faire une sauvegarde régulièrement.</p>
        <div class="btn-row">
          <button class="btn ghost" data-backup>${icon('download', 18)} Télécharger une sauvegarde</button>
          <label class="btn ghost">Restaurer une sauvegarde<input type="file" accept="application/json" hidden data-restore></label>
          <button class="btn ghost danger-text" data-reset>${icon('trash', 18)} Tout effacer</button>
        </div>
      </section>`;

    el.querySelector('#set-form').onsubmit = (e) => {
      e.preventDefault();
      const v = U.form(e.target);
      const horaires = {};
      JOURS.forEach(([d]) => { horaires[d] = { ouvert: !!v[`h${d}o`], debut: v[`h${d}d`] || '09:00', fin: v[`h${d}f`] || '18:00' }; });
      Object.keys(v).filter(k => /^h\d/.test(k)).forEach(k => delete v[k]);
      v.rappelsAuto = { veille: !!v.ra_veille, h30: !!v.ra_h30 };
      delete v.ra_veille; delete v.ra_h30;
      Object.assign(Store.settings, v, { horaires, tarif: Number(v.tarif) || 0, duree: Number(v.duree) || 50, delaiPaiement: Number(v.delaiPaiement) || 0 });
      Store.save(); UI.toast('Paramètres enregistrés'); App.renderNav();
    };
    el.querySelectorAll('[data-swatch]').forEach(b => b.onclick = () => { el.querySelector('[name=docColor]').value = b.dataset.swatch; });
    el.querySelector('[data-preview-invoice]').onclick = () => {
      const keep = Store.settings.docColor, keepM = Store.settings.mentions;
      Store.settings.docColor = el.querySelector('[name=docColor]').value;
      Store.settings.mentions = el.querySelector('[name=mentions]').value;
      UI.printDoc('Exemple de facture', Docs.invoice(Docs.sample()));
      Store.settings.docColor = keep; Store.settings.mentions = keepM;
    };
    el.querySelector('#cal-form').onsubmit = async (e) => {
      e.preventDefault();
      const v = U.form(e.target);
      Store.settings.calcom = { ...CalCom.conf(), apiKey: v.apiKey, lien: v.lien, auto: !!v.auto, lastError: '' };
      Store.save();
      if (!v.apiKey) { UI.toast('Indiquez la clé API Cal.com', 'warn'); return; }
      e.target.querySelector('[type=submit]').textContent = 'Synchronisation…';
      await CalCom.sync();
    };
    el.querySelector('[data-cal-off]')?.addEventListener('click', async () => {
      if (!(await UI.confirm('Déconnecter Cal.com ? Les rendez-vous déjà importés restent dans l\'agenda.', { ok: 'Déconnecter' }))) return;
      Store.settings.calcom = { lien: CalCom.conf().lien };
      Store.save(); App.refresh();
    });
    el.querySelector('[data-backup]').onclick = () =>
      U.download(`sauvegarde-cabinet-${U.today()}.json`, JSON.stringify(Store.data, null, 2), 'application/json');
    el.querySelector('[data-restore]').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data.settings || !Array.isArray(data.clients)) throw new Error();
        if (!(await UI.confirm('Remplacer toutes les données actuelles par cette sauvegarde ?', { ok: 'Restaurer', danger: true }))) return;
        Store.data = data; Store.save(); Store.load(); UI.toast('Sauvegarde restaurée'); App.refresh(); App.renderNav();
      } catch { UI.toast('Fichier de sauvegarde invalide', 'warn'); }
    };
    el.querySelector('[data-reset]').onclick = async () => {
      if (!(await UI.confirm('Effacer définitivement toutes les données (clients, agenda, factures…) ? Faites d\'abord une sauvegarde.', { ok: 'Tout effacer', danger: true }))) return;
      Store.data = Store.empty(); Store.save(); UI.toast('Données effacées'); App.refresh(); App.renderNav();
    };
  },
};
