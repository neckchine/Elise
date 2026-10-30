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

        <div class="sticky-save"><button class="btn primary big" type="submit">${icon('check', 18)} Enregistrer les paramètres</button></div>
      </form>

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
      Object.assign(Store.settings, v, { horaires, tarif: Number(v.tarif) || 0, duree: Number(v.duree) || 50, delaiPaiement: Number(v.delaiPaiement) || 0 });
      Store.save(); UI.toast('Paramètres enregistrés'); App.renderNav();
    };
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
