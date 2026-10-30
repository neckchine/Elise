/* Courriers d'adressage, attestations et comptes rendus à partir de modèles. */
const LETTER_TEMPLATES = {
  adressage: {
    label: 'Courrier d\'adressage',
    objet: 'Adressage de {{client}}',
    corps: `Cher(e) confrère / consœur,

Je me permets de vous adresser {{client}}{{naissance}}, que je reçois en consultation depuis le {{debut}}.

[Motif de l'adressage et éléments utiles à la prise en charge]

Je reste à votre disposition pour tout échange concernant ce suivi, dans le respect du secret professionnel et avec l'accord de la personne concernée.

Je vous prie d'agréer, cher(e) confrère / consœur, l'expression de mes salutations distinguées.`,
  },
  reponse: {
    label: 'Réponse à un adressage',
    objet: 'Suite à votre adressage de {{client}}',
    corps: `Cher(e) confrère / consœur,

Je vous remercie de m'avoir adressé {{client}}, que j'ai reçu(e) pour un premier rendez-vous le {{debut}}.

[Premières observations et proposition de suivi]

Bien confraternellement,`,
  },
  attestation: {
    label: 'Attestation de suivi',
    objet: 'Attestation de suivi',
    corps: `Je soussigné(e) {{praticien}}, {{profession}}, atteste que {{client}}{{naissance}} est suivi(e) à mon cabinet depuis le {{debut}}, à raison de {{nbSeances}} séance(s) à ce jour.

Attestation établie à la demande de l'intéressé(e) et remise en main propre pour servir et valoir ce que de droit.`,
  },
  libre: { label: 'Courrier libre', objet: '', corps: '' },
};

Views.courriers = {
  title: 'Courriers',

  render(el) {
    const list = [...Store.list('courriers')].sort((a, b) => b.date.localeCompare(a.date));
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Courriers</h1><p class="muted">Adressages, réponses à un confrère, attestations… prêts à imprimer.</p></div>
        <div class="head-actions"><button class="btn primary" data-new>${icon('plus', 18)} Nouveau courrier</button></div>
      </div>
      <div class="tpl-grid">
        ${Object.entries(LETTER_TEMPLATES).map(([k, t]) => `
          <button class="tpl card" data-tpl="${k}">${icon('letter', 26)}<strong>${t.label}</strong></button>`).join('')}
      </div>
      <section class="card flush">
        <h2 class="pad">Courriers rédigés</h2>
        ${list.length ? `<ul class="list clickable">${list.map(x => `
          <li class="row" data-id="${x.id}">
            <span class="time">${U.fmtDateShort(x.date)}</span>
            <span class="grow"><strong>${U.esc(x.objet)}</strong><br><span class="muted small">${U.esc(Store.clientName(x.clientId))} → ${U.esc(x.destinataire.split('\n')[0])}</span></span>
            <button class="icon-btn" data-print="${x.id}" aria-label="Imprimer">${icon('print', 18)}</button>
          </li>`).join('')}</ul>` : UI.empty('Aucun courrier pour le moment. Choisissez un modèle ci-dessus.')}
      </section>`;

    el.querySelector('[data-new]').onclick = () => this.open({ tpl: 'adressage' });
    el.querySelectorAll('[data-tpl]').forEach(b => b.onclick = () => this.open({ tpl: b.dataset.tpl }));
    el.querySelectorAll('[data-id]').forEach(r => r.onclick = (e) => {
      if (e.target.closest('[data-print]')) return this.print(r.dataset.id);
      this.open({ id: r.dataset.id });
    });
  },

  vars(clientId) {
    const c = Store.get('clients', clientId);
    const s = Store.settings;
    if (!c) return { praticien: s.nom, profession: s.profession };
    const evs = Store.list('events').filter(e => e.clientId === clientId && e.statut !== 'annule').sort((a, b) => a.start.localeCompare(b.start));
    return {
      client: `${c.prenom} ${c.nom}`,
      naissance: c.naissance ? `, né(e) le ${U.fmtDateShort(c.naissance)}` : '',
      debut: evs[0] ? U.fmtDateShort(evs[0].start) : U.fmtDateShort(new Date()),
      nbSeances: evs.filter(e => e.statut === 'honore').length,
      praticien: s.nom, profession: s.profession,
    };
  },

  open({ id, tpl = 'adressage', clientId } = {}) {
    const existing = id ? Store.get('courriers', id) : null;
    const t = LETTER_TEMPLATES[tpl];
    const x = existing || { clientId: clientId || '', date: U.today(), destinataire: Store.get('clients', clientId)?.adressePar || '', objet: t.objet, corps: t.corps, tpl };
    const filled = (str, cid) => U.fill(str, this.vars(cid));

    UI.modal({
      title: existing ? 'Modifier le courrier' : LETTER_TEMPLATES[x.tpl || 'libre'].label, wide: true,
      body: `<form class="form" id="let-form">
        <div class="grid2">
          <label class="field"><span>Concernant</span><select name="clientId">${UI.clientOptions(x.clientId)}</select></label>
          <label class="field"><span>Date</span><input type="date" name="date" value="${x.date}"></label>
        </div>
        <label class="field"><span>Destinataire (nom et adresse)</span><textarea name="destinataire" rows="3" placeholder="Dr Jean Leroy&#10;Médecin généraliste&#10;8 rue de la Paix, 75002 Paris">${U.esc(x.destinataire)}</textarea></label>
        <label class="field"><span>Objet</span><input name="objet" value="${U.esc(existing ? x.objet : filled(x.objet, x.clientId))}"></label>
        <label class="field"><span>Texte du courrier</span><textarea name="corps" rows="12">${U.esc(existing ? x.corps : filled(x.corps, x.clientId))}</textarea></label>
        <p class="hint">Les passages entre [crochets] sont à compléter. Votre signature et l'en-tête sont ajoutés automatiquement.</p>
      </form>`,
      footer: `${existing ? `<button class="btn ghost danger-text" data-del>${icon('trash', 18)} Supprimer</button>` : ''}
        <span class="spacer"></span>
        <button class="btn ghost" data-save>Enregistrer</button>
        <button class="btn primary" data-print>${icon('print', 18)} Enregistrer et imprimer</button>`,
      onMount: (el, api) => {
        const form = el.querySelector('#let-form');
        // Si on change de client sur un nouveau courrier, on remplit à nouveau le modèle
        form.clientId.onchange = () => {
          if (existing) return;
          form.objet.value = filled(t.objet, form.clientId.value);
          form.corps.value = filled(t.corps, form.clientId.value);
          const ap = Store.get('clients', form.clientId.value)?.adressePar;
          if (ap && !form.destinataire.value) form.destinataire.value = ap;
        };
        const save = () => {
          const v = U.form(form);
          if (!v.clientId) { UI.toast('Choisissez le client concerné', 'warn'); return null; }
          return Store.upsert('courriers', { ...x, ...v });
        };
        el.querySelector('[data-save]').onclick = () => { if (save()) { api.close(); UI.toast('Courrier enregistré'); App.refresh(); } };
        el.querySelector('[data-print]').onclick = () => { const s = save(); if (s) { api.close(); App.refresh(); this.print(s.id); } };
        el.querySelector('[data-del]')?.addEventListener('click', async () => {
          if (await UI.confirm('Supprimer ce courrier ?', { ok: 'Supprimer', danger: true })) { Store.remove('courriers', id); api.close(); App.refresh(); }
        });
      },
    });
  },

  print(id) {
    const x = Store.get('courriers', id);
    const s = Store.settings;
    UI.printDoc(x.objet, `
      <div class="doc letter">
        <div class="doc-head">
          <div>
            <div class="doc-name">${U.esc(s.nom)}</div>
            <div>${U.esc(s.profession)}</div>
            <div>${U.nl2br(s.adresse)}</div>
            <div>${U.esc(s.tel)} · ${U.esc(s.email)}</div>
            ${s.adeli ? `<div>N° ADELI / RPPS : ${U.esc(s.adeli)}</div>` : ''}
          </div>
          <div class="doc-to">${U.nl2br(x.destinataire)}</div>
        </div>
        <p class="right">${U.esc(s.adresse.split('\n').pop().replace(/^\d+\s*/, ''))}, le ${U.fmtDate(x.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p><strong>Objet : ${U.esc(x.objet)}</strong></p>
        <div class="letter-body">${U.nl2br(x.corps)}</div>
        <div class="signature">${U.esc(s.nom)}<br>${U.esc(s.profession)}</div>
        <p class="doc-small">Document confidentiel — couvert par le secret professionnel.</p>
      </div>`);
  },
};
